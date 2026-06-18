import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, ForeignKey, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity()
export class Meter {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('varchar')
    metername!: string;

    @Column('float')
    capacity!: number;

    @Column('uuid')
    ownerid!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'id' })
    owner!: User;
}
