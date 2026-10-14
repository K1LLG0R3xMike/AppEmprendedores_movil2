import { Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PuntoSerie, SerieMes } from '../../services/ia-insights.utils';

interface Tick {
  value: number;
  pos: number;
  label: string;
}

const ALTO = 220;
const MARGEN = { top: 16, right: 84, bottom: 28, left: 64 };
// En pantallas estrechas no hay etiquetas al final de las lineas (las cubren leyenda y tooltip)
const MARGEN_COMPACTO = { top: 16, right: 12, bottom: 28, left: 52 };
const ANCHO_COMPACTO = 480;

// Grafico de lineas: ingresos y gastos acumulados del mes (real hasta hoy, proyeccion punteada hasta el cierre)
@Component({
  selector: 'app-month-projection-chart',
  templateUrl: './month-projection-chart.component.html',
  styleUrls: ['./month-projection-chart.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class MonthProjectionChartComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) serie!: SerieMes;

  readonly alto = ALTO;
  ancho = 600;

  yTicks: Tick[] = [];
  xTicks: Tick[] = [];
  ingresosReal = '';
  gastosReal = '';
  ingresosProyeccion = '';
  gastosProyeccion = '';

  diaActivo: number | null = null;

  private yMax = 1;
  private resizeObserver?: ResizeObserver;

  constructor(private host: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngOnInit(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width || 0);
      if (width > 0 && width !== this.ancho) {
        this.zone.run(() => {
          this.ancho = width;
          this.calcular();
        });
      }
    });
    this.resizeObserver.observe(this.host.nativeElement);
  }

  ngOnChanges(): void {
    this.calcular();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  get compacto(): boolean {
    return this.ancho < ANCHO_COMPACTO;
  }

  get margen() {
    return this.compacto ? MARGEN_COMPACTO : MARGEN;
  }

  get anchoPlot(): number {
    return Math.max(10, this.ancho - this.margen.left - this.margen.right);
  }

  get altoPlot(): number {
    return ALTO - this.margen.top - this.margen.bottom;
  }

  x(dia: number): number {
    const span = Math.max(1, this.serie.diasMes - 1);
    return this.margen.left + ((dia - 1) / span) * this.anchoPlot;
  }

  y(valor: number): number {
    return this.margen.top + this.altoPlot - (Math.max(0, valor) / this.yMax) * this.altoPlot;
  }

  get hoyX(): number {
    return this.x(this.serie.hoy);
  }

  get puntoHoy(): PuntoSerie {
    return this.serie.real[this.serie.real.length - 1] || { dia: this.serie.hoy, ingresos: 0, gastos: 0 };
  }

  // Etiquetas directas al final de cada linea, separadas si quedan muy juntas
  get etiquetasFinales(): { ingresosY: number; gastosY: number } {
    let ingresosY = this.y(this.serie.cierre.ingresos);
    let gastosY = this.y(this.serie.cierre.gastos);
    const minimo = 30;
    if (Math.abs(ingresosY - gastosY) < minimo) {
      const centro = (ingresosY + gastosY) / 2;
      const arriba = centro - minimo / 2;
      const abajo = centro + minimo / 2;
      if (this.serie.cierre.ingresos >= this.serie.cierre.gastos) {
        ingresosY = arriba;
        gastosY = abajo;
      } else {
        gastosY = arriba;
        ingresosY = abajo;
      }
    }
    const limitar = (v: number) => Math.min(this.margen.top + this.altoPlot, Math.max(this.margen.top + 8, v));
    return { ingresosY: limitar(ingresosY), gastosY: limitar(gastosY) };
  }

  // Valores en un dia: reales hasta hoy, interpolados sobre la proyeccion despues
  valorEn(dia: number): PuntoSerie & { proyectado: boolean } {
    if (dia <= this.serie.hoy) {
      const punto = this.serie.real[dia - 1] || this.puntoHoy;
      return { ...punto, proyectado: false };
    }
    const inicio = this.puntoHoy;
    const fin = this.serie.cierre;
    const t = (dia - inicio.dia) / Math.max(1, fin.dia - inicio.dia);
    return {
      dia,
      ingresos: Math.round(inicio.ingresos + (fin.ingresos - inicio.ingresos) * t),
      gastos: Math.round(inicio.gastos + (fin.gastos - inicio.gastos) * t),
      proyectado: true
    };
  }

  get activo(): (PuntoSerie & { proyectado: boolean }) | null {
    return this.diaActivo ? this.valorEn(this.diaActivo) : null;
  }

  get tooltipIzquierda(): boolean {
    return this.diaActivo !== null && this.x(this.diaActivo) > this.ancho / 2;
  }

  onPointerMove(event: PointerEvent): void {
    const svg = event.currentTarget as SVGElement;
    const rect = svg.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * this.ancho;
    const span = Math.max(1, this.serie.diasMes - 1);
    const dia = Math.round(((px - this.margen.left) / this.anchoPlot) * span) + 1;
    this.diaActivo = Math.min(this.serie.diasMes, Math.max(1, dia));
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const actual = this.diaActivo ?? this.serie.hoy;
    const siguiente = actual + (event.key === 'ArrowRight' ? 1 : -1);
    this.diaActivo = Math.min(this.serie.diasMes, Math.max(1, siguiente));
  }

  limpiar(): void {
    this.diaActivo = null;
  }

  money(value: number): string {
    const abs = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.abs(value || 0));
    return value < 0 ? `-$${abs}` : `$${abs}`;
  }

  private moneyCorto(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
    if (value >= 1_000) return `$${(value / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} mil`;
    return `$${Math.round(value)}`;
  }

  private calcular(): void {
    if (!this.serie) return;

    const valores = [
      ...this.serie.real.flatMap((p) => [p.ingresos, p.gastos]),
      this.serie.cierre.ingresos,
      this.serie.cierre.gastos
    ];
    const paso = pasoBonito(Math.max(1, ...valores) / 4);
    this.yMax = paso * Math.max(1, Math.ceil(Math.max(1, ...valores) / paso));

    this.yTicks = [];
    for (let v = 0; v <= this.yMax + 1e-9; v += paso) {
      this.yTicks.push({ value: v, pos: this.y(v), label: this.moneyCorto(v) });
    }

    const dias = [1, 8, 15, 22, this.serie.diasMes];
    this.xTicks = dias.map((dia) => ({ value: dia, pos: this.x(dia), label: String(dia) }));

    const linea = (puntos: PuntoSerie[], campo: 'ingresos' | 'gastos') =>
      puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${this.x(p.dia).toFixed(1)},${this.y(p[campo]).toFixed(1)}`).join(' ');

    this.ingresosReal = linea(this.serie.real, 'ingresos');
    this.gastosReal = linea(this.serie.real, 'gastos');
    this.ingresosProyeccion = linea([this.puntoHoy, this.serie.cierre], 'ingresos');
    this.gastosProyeccion = linea([this.puntoHoy, this.serie.cierre], 'gastos');
  }
}

// 1, 2, 2.5 o 5 por potencia de 10
function pasoBonito(valor: number): number {
  const potencia = Math.pow(10, Math.floor(Math.log10(Math.max(valor, 1))));
  const base = valor / potencia;
  const opciones = [1, 2, 2.5, 5, 10];
  return (opciones.find((o) => base <= o) || 10) * potencia;
}
