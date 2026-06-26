import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLogDto } from './dto/create-log.dto';
import { Log } from './entities/log.entity';
import { Meter } from '../meters/entities/meter.entity';
import { Resend } from 'resend';

@Injectable()
export class LogsService {
  private readonly resend: Resend;

  constructor(
    @InjectRepository(Log)
    private readonly logsRepository: Repository<Log>,
    @InjectRepository(Meter)
    private readonly meterRepository: Repository<Meter>,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async create(createLogDto: CreateLogDto): Promise<Log> {
    const { currentPercentage, meterId } = createLogDto;

    if (currentPercentage < 0) {
      throw new BadRequestException('currentPercentage must not be a negative number');
    }

    if (currentPercentage > 100) {
      throw new BadRequestException('currentPercentage must not exceed 100');
    }

    const meter = await this.getMeterWithOwner(meterId);
    if (!meter) {
      throw new BadRequestException('Invalid data: verify that meterId references an existing meter');
    }

    if (!meter.owner?.stripeSubscriptionId) {
      throw new UnauthorizedException('El usuario no es premium');
    }

    const lastLog = await this.getLastLogByMeter(meterId);

    const meditionDate = new Date();

    const newLog = this.logsRepository.create({
      currentPercentage,
      meditionDate,
      meterid: meterId,
    });

    const savedLog = await this.logsRepository.save(newLog);

    if (lastLog) {
      const meterInfo = await this.getMeterOwnerInfo(meterId);
      if (meterInfo) {
        this.checkForLeak(lastLog.currentPercentage, currentPercentage, meterInfo);
        this.checkForRefill(lastLog.currentPercentage, currentPercentage, meterInfo);
      }
    }

    return savedLog;
  }

  private async getMeterWithOwner(meterId: string) {
    return this.meterRepository.findOne({
      where: { id: meterId },
      relations: { owner: true },
    });
  }

  private async getLastLogByMeter(meterId: string): Promise<Log | null> {
    return this.logsRepository.findOne({
      where: { meterid: meterId },
      order: { meditionDate: 'DESC' },
    });
  }

  private async getMeterOwnerInfo(
    meterId: string,
  ): Promise<{ ownerEmail: string; meterName: string } | null> {
    const meter = await this.meterRepository.findOne({
      where: { id: meterId },
      relations: { owner: true },  // ✅ objeto en lugar de array, sin error de tipos
    });

    if (!meter?.owner?.email) return null;

    return {
      ownerEmail: meter.owner.email,
      meterName: meter.metername,
    };
  }

  private async checkForLeak(
    previousPercentage: number,
    currentPercentage: number,
    meterInfo: { ownerEmail: string; meterName: string },
  ): Promise<void> {
    const drop = previousPercentage - currentPercentage;

    if (drop > 10) {
      try {
        await this.resend.emails.send({
          from: 'onboarding@resend.dev',
          to: meterInfo.ownerEmail,
          subject: `⚠️ Posible fuga detectada en "${meterInfo.meterName}"`,
          html: `
            <h2>Alerta de posible fuga</h2>
            <p>Se detectó una caída significativa en el medidor <strong>${meterInfo.meterName}</strong>.</p>
            <p>Te vas a moriri we</p>
            <ul>
              <li>Porcentaje anterior: <strong>${previousPercentage}%</strong></li>
              <li>Porcentaje actual: <strong>${currentPercentage}%</strong></li>
              <li>Caída registrada: <strong>${drop.toFixed(2)}%</strong></li>
            </ul>
            <p>Por favor, revisa el sistema para descartar una fuga.</p>
          `,
        });
      } catch (error) {
        console.error('Error al enviar correo de fuga:', error);
      }
    }
  }

  private async checkForRefill(
    previousPercentage: number,
    currentPercentage: number,
    meterInfo: { ownerEmail: string; meterName: string },
  ): Promise<void> {
    const increase = currentPercentage - previousPercentage;

    if (increase > 0) {
      try {
        await this.resend.emails.send({
          from: 'onboarding@resend.dev',
          to: meterInfo.ownerEmail,
          subject: `🔄 Recarga identificada en "${meterInfo.meterName}"`,
          html: `
            <h2>Recarga identificada</h2>
            <p>Se detectó una recarga en el medidor <strong>${meterInfo.meterName}</strong>.</p>
            <ul>
              <li>Porcentaje anterior: <strong>${previousPercentage}%</strong></li>
              <li>Porcentaje actual: <strong>${currentPercentage}%</strong></li>
              <li>Recarga de: <strong>${increase.toFixed(2)}%</strong></li>
            </ul>
          `,
        });
      } catch (error) {
        console.error('Error al enviar correo de recarga:', error);
      }
    }
  }

  async predictRecharge(meterId: string, userId: string): Promise<object> {

    // Validar que el medidor existe y pertenece al usuario
    const meter = await this.meterRepository.findOne({
      where: { id: meterId, ownerid: userId },
      relations: { owner: true },
    });

    if (!meter) {
      throw new NotFoundException('El medidor solicitado no existe o no está asignado a este usuario.');
    }

    // Obtener historial de logs ordenado
    const logs = await this.logsRepository.find({
      where: { meterid: meterId },
      order: { meditionDate: 'ASC' },
    });

    // Validar datos suficientes (mínimo 7 días de telemetría)
    const uniqueDays = new Set(logs.map(log => new Date(log.meditionDate).toISOString().split('T')[0]));
    if (logs.length < 15) {
      return {
        meterId,
        prediction: null,
        message: 'Historial de consumo insuficiente para calcular una predicción confiable. Se requieren al menos 15 lecturas de telemetría.',
      };
    }

    // Calcular tasa de consumo diario promedio
    const firstLog = logs[0];
    const lastLog = logs[logs.length - 1];
    const totalDays = (new Date(lastLog.meditionDate).getTime() - new Date(firstLog.meditionDate).getTime()) / (1000 * 60 * 60 * 24);
    const totalConsumption = firstLog.currentPercentage - lastLog.currentPercentage;
    const dailyConsumptionRate = totalConsumption / totalDays;

    // Calcular días restantes y fecha estimada de recarga
    const daysRemaining = Math.max(0, Math.round(lastLog.currentPercentage / dailyConsumptionRate));
    const estimatedRechargeDate = new Date();
    estimatedRechargeDate.setDate(estimatedRechargeDate.getDate() + daysRemaining);

    // Nivel de confianza basado en cantidad de datos
    const confidenceScore = Math.min(0.99, parseFloat((uniqueDays.size / 30).toFixed(2)));

    return {
      meterId,
      prediction: {
        estimatedRechargeDate: estimatedRechargeDate.toISOString(),
        daysRemaining,
        estimatedConsumptionRate: `${dailyConsumptionRate.toFixed(2)} %/día`,
        confidenceScore,
      },
    };
  }
}