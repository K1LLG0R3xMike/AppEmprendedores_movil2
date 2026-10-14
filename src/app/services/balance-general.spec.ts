import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ApiService } from './api-service';
import { calcularBalanceGeneral } from './balance.utils';
import { environment } from '../../environments/environment';

describe('calcularBalanceGeneral', () => {
  it('suma capital + ventas + ingresos - egresos - gastos fijos pagados', () => {
    const result = calcularBalanceGeneral({
      capitalInicial: '1000',
      ventas: [{ totalVenta: 200 }, { totalVenta: '50' }],
      transacciones: [{ tipo: false, monto: 100 }, { tipo: true, monto: 30 }],
      gastosFijosPagados: [{ costoGasto: 70 }, { costoGasto: null }]
    });

    expect(result).toEqual({
      capitalInicial: 1000,
      ventas: 250,
      transaccionesIngreso: 100,
      transaccionesEgreso: 30,
      gastosFijosPagados: 70,
      balanceTotal: 1250
    });
  });

  it('acepta tipo de transaccion antiguo como texto o numero', () => {
    const result = calcularBalanceGeneral({
      capitalInicial: 0,
      ventas: [],
      transacciones: [
        { tipo: 'income', monto: 3 },
        { tipo: 'ingreso', monto: 4 },
        { tipo: 0, monto: 5 },
        { tipo: 'expense', monto: 1 },
        { tipo: 1, monto: 2 }
      ],
      gastosFijosPagados: []
    });
    expect(result.transaccionesIngreso).toBe(12);
    expect(result.transaccionesEgreso).toBe(3);
  });

  it('ignora valores no numericos', () => {
    const result = calcularBalanceGeneral({
      capitalInicial: undefined,
      ventas: [{ totalVenta: 'abc' }],
      transacciones: [],
      gastosFijosPagados: []
    });
    expect(result.balanceTotal).toBe(0);
  });
});

describe('ApiService.getBalanceGeneral', () => {
  let service: ApiService;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/balance-general/neg1`;

  // getToken() es async: esperar a que la peticion HTTP quede registrada
  const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    spyOn(service, 'getToken').and.resolveTo('token');
  });

  afterEach(() => http.verify());

  it('usa el endpoint del backend cuando responde', async () => {
    const fallbackSpy = spyOn(service, 'getTransactionsByBusiness');
    const promise = service.getBalanceGeneral('neg1', 0);
    await flushMicrotasks();

    const req = http.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    req.flush({ data: { capitalInicial: 1000, ventas: 500, transaccionesIngreso: 0, transaccionesEgreso: 0, gastosFijosPagados: 0, balanceTotal: 1500 } });

    const balance = await promise;
    expect(balance.balanceTotal).toBe(1500);
    expect(balance.source).toBe('backend');
    expect(fallbackSpy).not.toHaveBeenCalled();
    expect((await service.getBalanceGeneralCache('neg1'))?.balanceTotal).toBe(1500);
  });

  it('calcula en el front si el endpoint devuelve 404', async () => {
    spyOn(service, 'getTransactionsByBusiness').and.resolveTo([
      { tipoOriginal: false, tipo: false, monto: 100 },
      { tipoOriginal: true, tipo: true, monto: 40 }
    ]);
    spyOn(service, 'getProductsByBusiness').and.resolveTo([{ idProducto: 'p1' }, { idProducto: 'p2' }]);
    spyOn(service, 'getVentasByProducto').and.callFake(async (id: string) =>
      id === 'p1' ? [{ totalVenta: 300 }] : [{ totalVenta: 200 }, { totalVenta: 50 }]);
    spyOn(service, 'getGastosFijosPagados').and.resolveTo([
      { idNegocio: 'neg1', costoGasto: 60 },
      { idNegocio: 'otro', costoGasto: 999 }
    ]);

    const promise = service.getBalanceGeneral('neg1', 1000);
    await flushMicrotasks();
    http.expectOne(url).flush('Cannot GET', { status: 404, statusText: 'Not Found' });

    const balance = await promise;
    expect(balance.source).toBe('frontend');
    // 1000 + 550 + 100 - 40 - 60
    expect(balance.balanceTotal).toBe(1550);
  });

  it('no calcula en el front si el backend responde 403', async () => {
    const fallbackSpy = spyOn(service, 'getTransactionsByBusiness');
    const promise = service.getBalanceGeneral('neg1', 1000);
    await flushMicrotasks();
    http.expectOne(url).flush({ message: 'No tienes permisos' }, { status: 403, statusText: 'Forbidden' });

    await expectAsync(promise).toBeRejected();
    expect(fallbackSpy).not.toHaveBeenCalled();
  });
});
