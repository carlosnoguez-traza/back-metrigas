import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Log } from '../entities/log.entity';
import { Meter } from '../../meters/entities/meter.entity';
import { GetMetricDto } from '../dto/get-metric.dto';
import { DatoMensual, MetricsResponse } from '../interfaces/metrics-response.interface';

@Injectable()
export class MetricsService {
    constructor(
        @InjectRepository(Log)
        private readonly logsRepository: Repository<Log>,
        @InjectRepository(Meter)
        private readonly meterRepository: Repository<Meter>,
    ) { }

    async consultMeters(
        getMetricDto: GetMetricDto,
        userId: string,
    ): Promise<MetricsResponse> {
        const { meterId, page = 1, limit = 24 } = getMetricDto;

        // ── Verificar que el medidor existe y que el usuario es dueño ──────────────
        const meter = await this.meterRepository.findOne({
            where: { id: meterId },
            relations: { owner: true },
        });

        if (!meter || meter.ownerid !== userId) {
            throw new ForbiddenException(
                'You do not have access to this meter',
            );
        }

        // ── Respuesta vacía si no hay logs ─────────────────────────────────────────
        const totalLogs = await this.logsRepository.count({
            where: { meterid: meterId },
        });

        if (totalLogs === 0) {
            return this.emptyResponse(page);
        }

        // ── Query con GROUP BY año/mes usando QueryBuilder ─────────────────────────
        const rawMonthly: Array<{
            anio: string;
            mes: string;
            consumo: string;
            porcentaje_promedio: string;
            total_meses: string;
        }> = await this.logsRepository
            .createQueryBuilder('log')
            .select('EXTRACT(YEAR FROM log.meditionDate)::int', 'anio')
            .addSelect('EXTRACT(MONTH FROM log.meditionDate)::int', 'mes')
            .addSelect(
                'MAX(log.currentPercentage) - MIN(log.currentPercentage)',
                'consumo',
            )
            .addSelect('AVG(log.currentPercentage)', 'porcentaje_promedio')
            .addSelect('COUNT(*) OVER()', 'total_meses') // total sin paginar
            .where('log.meterid = :meterId', { meterId })
            .groupBy('anio, mes')
            .orderBy('anio', 'DESC')
            .addOrderBy('mes', 'DESC')
            .offset((page - 1) * limit)
            .limit(limit)
            .getRawMany();

        // ── Último log ─────────────────────────────────────────────────────────────
        const lastLog = await this.logsRepository.findOne({
            where: { meterid: meterId },
            order: { meditionDate: 'DESC' },
        });

        // ── Mapear datos mensuales ─────────────────────────────────────────────────
        const datos_mensuales: DatoMensual[] = rawMonthly.map((row) => ({
            anio: Number(row.anio),
            mes: Number(row.mes),
            consumo: Math.max(0, parseFloat(row.consumo)),        // nunca negativo
            porcentaje_promedio: parseFloat(
                parseFloat(row.porcentaje_promedio).toFixed(2),
            ),
        }));

        const totalMeses = rawMonthly.length > 0
            ? parseInt(rawMonthly[0].total_meses)
            : 0;

        // ── Calcular métricas globales a partir de los datos mensuales paginados ───
        const consumos = datos_mensuales.map((d) => d.consumo);
        const consumo_total = parseFloat(
            consumos.reduce((a, b) => a + b, 0).toFixed(2),
        );
        const promedio_mensual = datos_mensuales.length
            ? parseFloat((consumo_total / datos_mensuales.length).toFixed(2))
            : 0;
        const max_mensual = datos_mensuales.length ? Math.max(...consumos) : 0;
        const porcentaje_promedio = datos_mensuales.length
            ? parseFloat(
                (
                    datos_mensuales.reduce((a, b) => a + b.porcentaje_promedio, 0) /
                    datos_mensuales.length
                ).toFixed(2),
            )
            : 0;

        // ── Estimar próxima carga (promedio de consumo mensual sobre capacidad) ────
        const proxima_carga_estimada = this.estimateNextRefill(
            lastLog!.currentPercentage,
            promedio_mensual,
            lastLog!.meditionDate,
        );

        return {
            consumo_total,
            promedio_mensual,
            max_mensual,
            porcentaje_promedio,
            fecha_ultimo_log: lastLog?.meditionDate ?? null,
            proxima_carga_estimada,
            datos_mensuales,
            paginacion: {
                pagina_actual: page,
                total_meses: totalMeses,
                total_paginas: Math.ceil(totalMeses / limit),
            },
        };
    }

    // ── Estima cuándo se agotará el depósito al ritmo actual ────────────────────
    private estimateNextRefill(
        currentPercentage: number,
        promedioMensual: number,
        lastDate: Date,
    ): Date | null {
        if (promedioMensual <= 0) return null;

        const mesesRestantes = currentPercentage / promedioMensual;
        const estimated = new Date(lastDate);
        estimated.setDate(estimated.getDate() + Math.round(mesesRestantes * 30));
        return estimated;
    }

    // ── Respuesta vacía normalizada ──────────────────────────────────────────────
    private emptyResponse(page: number): MetricsResponse {
        return {
            consumo_total: 0,
            promedio_mensual: 0,
            max_mensual: 0,
            porcentaje_promedio: 0,
            fecha_ultimo_log: null,
            proxima_carga_estimada: null,
            datos_mensuales: [],
            paginacion: { pagina_actual: page, total_meses: 0, total_paginas: 0 },
        };
    }
}