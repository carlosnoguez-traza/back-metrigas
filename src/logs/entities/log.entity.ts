import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Meter } from '../../meters/entities/meter.entity';

@Entity()
export class Log {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('float')
    currentPercentage!: number;

    @Column('date')
    meditionDate!: Date;

    @Column('uuid')
    meterid!: string;

    @ManyToOne(() => Meter)
    @JoinColumn({ name: 'meterid' })
    meter!: Meter;
}
