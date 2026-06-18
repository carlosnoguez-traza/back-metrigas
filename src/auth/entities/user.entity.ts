import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('varchar', { unique: true })
    email!: string;

    @Column('varchar')
    username!: string;

    @Column('int')
    age!: number;

    @Column('varchar')
    pwd!: string;

    @Column('boolean', { default: false })
    isActive!: boolean;

    @Column('timestamp', { default: () => "CURRENT_TIMESTAMP + INTERVAL '1 month'" })
    subscriptionDate!: Date;

    @Column('varchar', { nullable: true })
    verificationCode!: string | null;

    @Column('timestamp', { nullable: true })
    verificationCodeExpires!: Date | null;
}