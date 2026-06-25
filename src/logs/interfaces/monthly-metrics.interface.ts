import { ApiProperty } from '@nestjs/swagger';

export class LogEntry {
    @ApiProperty({ example: '2026-06-01T10:00:00.000Z' })
    date!: Date;

    @ApiProperty({ example: 75.5 })
    percentage!: number;
}

export class ChartData {
    @ApiProperty({ example: 1 })
    day!: number;

    @ApiProperty({ example: 68.3 })
    value!: number;
}

export class MonthlyMetricsResponse {
    @ApiProperty({ example: 6 })
    month!: number;

    @ApiProperty({ example: 2026 })
    year!: number;

    @ApiProperty({ example: 45.2 })
    totalConsumption!: number;

    @ApiProperty({ example: 68.4 })
    averagePercentage!: number;

    @ApiProperty({ example: 8.3 })
    standardDeviation!: number;

    @ApiProperty({ example: 60.1 })
    lowerBound!: number;

    @ApiProperty({ example: 76.7 })
    upperBound!: number;

    @ApiProperty({ example: 12 })
    activeDays!: number;

    @ApiProperty({ type: [LogEntry] })
    logs!: LogEntry[];

    @ApiProperty({ type: [ChartData] })
    chartData!: ChartData[];

    @ApiProperty({ type: [LogEntry], description: 'Logs outside the normal range (±1 std dev)' })
    outliers!: LogEntry[];

    @ApiProperty({ example: 'No data for this period', nullable: true })
    message!: string | null;
}