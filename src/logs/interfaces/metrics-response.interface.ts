export interface DatoMensual {
    mes: number;
    anio: number;
    consumo: number;
    porcentaje_promedio: number;
}

export interface MetricsResponse {
    consumo_total: number;
    promedio_mensual: number;
    max_mensual: number;
    porcentaje_promedio: number;
    fecha_ultimo_log: Date | null;
    proxima_carga_estimada: Date | null;
    datos_mensuales: DatoMensual[];
    paginacion: {
        pagina_actual: number;
        total_meses: number;
        total_paginas: number;
    };
}