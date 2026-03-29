import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../environments/environment';

interface FirebaseAuthResponse {
  idToken: string;
  localId: string;
  email?: string;
  refreshToken?: string;
  expiresIn?: string;
}

interface UserData {
  [key: string]: any;
}

interface BusinessData {
  [key: string]: any;
}

export type DashboardBalanceMovementType =
  | 'capital_inicial'
  | 'venta'
  | 'transaccion_ingreso'
  | 'transaccion_egreso'
  | 'gasto_fijo_pagado'
  | 'ajuste_manual';

export interface DashboardBalanceComponents {
  capitalInicial: number;
  ventas: number;
  transaccionesIngreso: number;
  transaccionesEgreso: number;
  gastosFijosPagados: number;
  ajustes: number;
  balanceTotal: number;
  lastMovementAt: string | null;
  updatedAt: string;
  version: number;
}

export type DashboardBalanceFlow = 'income' | 'expense' | 'neutral';

export interface DashboardBalanceMovementRecord {
  id: string;
  movementType: DashboardBalanceMovementType;
  flow: DashboardBalanceFlow;
  amount: number;
  amountSigned: number;
  createdAt: string;
  idNegocio?: string;
  description?: string;
  category?: string;
  source?: string;
  metadata?: { [key: string]: any };
}

export interface DashboardBalanceMovementMetadata {
  idNegocio?: string;
  description?: string;
  category?: string;
  source?: string;
  metadata?: { [key: string]: any };
}

interface DashboardBalanceAnalysisData {
  ingresos: DashboardBalanceMovementRecord[];
  egresos: DashboardBalanceMovementRecord[];
  movimientos: DashboardBalanceMovementRecord[];
  updatedAt: string;
  version: number;
}

export interface DashboardWeeklySnapshot {
  idSnapshot: string;
  uid: string;
  idNegocio: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  syncedAt: string;
  source: 'frontend_scheduler' | 'dashboard' | string;
  balanceTotal: number;
  components: DashboardBalanceComponents;
  ingresos: DashboardBalanceMovementRecord[];
  egresos: DashboardBalanceMovementRecord[];
  movimientos: DashboardBalanceMovementRecord[];
  weeklyIngresos: DashboardBalanceMovementRecord[];
  weeklyEgresos: DashboardBalanceMovementRecord[];
  weeklyMovimientos: DashboardBalanceMovementRecord[];
}

interface DashboardWeeklySyncState {
  weekKey: string;
  idNegocio: string;
  snapshotId: string;
  syncedAt: string;
}

export interface DashboardWeeklySyncStatus {
  idNegocio: string;
  currentWeekKey: string;
  lastSyncedWeekKey: string | null;
  lastSyncedAt: string | null;
  pending: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // ðŸ”¹ Configuration
  private readonly firebaseApiKey = environment.firebaseApiKey;
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly requestTimeout = 10000; // 10 segundos
  private readonly dashboardBalanceKey = 'dashboard_balance_total';
  private readonly dashboardBalanceComponentsKey = 'dashboard_balance_components';
  private readonly dashboardBalanceMovementsKey = 'dashboard_balance_movements';
  private readonly dashboardWeeklySyncStateKey = 'dashboard_balance_weekly_sync_state';
  private readonly dashboardWeeklySyncEndpoint = '/balance-semanal/';
  private readonly balancePdfEndpoint = '/balance-pdf';
  private readonly dashboardBalanceMovementsLimit = 5000;
  private dashboardWeeklySyncTimer: any = null;

  constructor(private http: HttpClient) {}

  // ðŸ”¹ Obtener datos del usuario por UID desde el backend
  async getUserByUid(uid: string): Promise<UserData> {
    if (!uid || uid.trim() === '') {
      throw new Error('El UID no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token || token.trim() === '') {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/users/${uid}`;
    
    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response = await this.http.get<UserData>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (!response) {
        throw new Error('Respuesta vacÃ­a del servidor.');
      }

      return response;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Usuario no encontrado.');
      }
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Registrar usuario en Firebase Auth
  async register(email: string, password: string): Promise<FirebaseAuthResponse> {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.firebaseApiKey}`;

    const body = {
      email: email,
      password: password,
      returnSecureToken: true
    };

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const response = await this.http.post<FirebaseAuthResponse>(url, body, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (response) {
        // Guardar token y UID en el almacenamiento seguro
        await Preferences.set({
          key: 'idToken',
          value: response.idToken
        });
        
        await Preferences.set({
          key: 'uid',
          value: response.localId
        });

        return response;
      } else {
        throw new Error('Respuesta invÃ¡lida del servidor.');
      }
    } catch (error: any) {
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Login usuario con Firebase Auth
  async login(email: string, password: string): Promise<FirebaseAuthResponse> {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.firebaseApiKey}`;

    const body = {
      email: email,
      password: password,
      returnSecureToken: true
    };

    console.log('[LOGIN] Intentando login para:', email);

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const response = await this.http.post<FirebaseAuthResponse>(url, body, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (response) {
        console.log('[LOGIN] Status: 200');
        console.log('[LOGIN] Login exitoso para:', email, '(uid:', response.localId, ')');
        console.log('[LOGIN] Token recibido:', response.idToken);
        // Guardar token y UID en el almacenamiento seguro
        await Preferences.set({
          key: 'idToken',
          value: response.idToken
        });
        
        await Preferences.set({
          key: 'uid',
          value: response.localId
        });

        return response;
      } else {
        throw new Error('Respuesta invÃ¡lida del servidor.');
      }
    } catch (error: any) {
      console.log('[LOGIN] Error:', error);
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Obtener token almacenado
  async getToken(): Promise<string | null> {
    try {
      const result = await Preferences.get({ key: 'idToken' });
      return result.value;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  }

  // ðŸ”¹ Obtener UID almacenado
  async getUid(): Promise<string | null> {
    try {
      const result = await Preferences.get({ key: 'uid' });
      return result.value;
    } catch (error) {
      console.error('Error obteniendo UID:', error);
      return null;
    }
  }

  // ðŸ”¹ Verificar si el token es vÃ¡lido
  async isTokenValid(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    try {
      // Verificar con una llamada simple al backend
      const uid = await this.getUid();
      if (!uid) return false;

      const url = `${this.baseUrl}/users/${uid}`;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      await this.http.get(url, { headers })
        .pipe(
          timeout(5000), // Timeout mÃ¡s corto para verificaciÃ³n
          catchError(() => {
            console.log('[API] Token validation failed');
            return throwError(() => new Error('Token invalid'));
          })
        )
        .toPromise();

      return true;
    } catch (error) {
      console.log('[API] Token is invalid or expired');
      return false;
    }
  }

  // ðŸ”¹ Ejemplo de ruta protegida al backend
  async getBusiness(): Promise<BusinessData> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/business`;

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response = await this.http.get<BusinessData>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (!response) {
        throw new Error('Respuesta vacÃ­a del servidor.');
      }

      return response;
    } catch (error: any) {
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Crear negocio en el backend
  async createBusiness(businessData: any): Promise<BusinessData> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/business`;

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response = await this.http.post<BusinessData>(url, businessData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (!response) {
        throw new Error('Respuesta vacía del servidor.');
      }


      const capitalInicial = Number(
        businessData?.capitalInicial ??
        response?.['data']?.['capitalInicial'] ??
        response?.['capitalInicial'] ??
        0
      );

      try {
        await this.initializeDashboardBalanceFromCapital(Number.isFinite(capitalInicial) ? capitalInicial : 0);
      } catch (storageError) {
        console.warn('[API] No se pudo inicializar balance local tras crear negocio:', storageError);
      }

      return response;
    } catch (error: any) {
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Obtener negocios por UID del usuario
  async getBusinessByUserId(uid: string): Promise<BusinessData[]> {
    if (!uid || uid.trim() === '') {
      throw new Error('El UID no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/business/user/${uid}`;

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response = await this.http.get<{ message: string, data: BusinessData[] }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (!response) {
        throw new Error('Respuesta vacÃ­a del servidor.');
      }

      return response.data || [];
    } catch (error: any) {
      if (error.status === 404) {
        // No se encontraron negocios para este usuario
        return [];
      }
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Logout â†’ elimina token y UID
  async logout(): Promise<void> {
    try {
      await Preferences.remove({ key: 'idToken' });
      await Preferences.remove({ key: 'uid' });
      console.log('[LOGOUT] SesiÃ³n cerrada correctamente');
    } catch (error) {
      console.error('Error cerrando sesiÃ³n:', error);
      throw new Error('Error cerrando sesiÃ³n.');
    }
  }

  // ðŸ”¹ Verificar si el usuario estÃ¡ autenticado
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null && token.trim() !== '';
  }

  // ðŸ”¹ Balance local para Dashboard (persistente en Ionic/Android)
  async getDashboardBalanceLocal(): Promise<number> {
    try {
      const pref = await Preferences.get({ key: this.dashboardBalanceKey });
      if (pref.value !== null && pref.value !== undefined) {
        const parsed = Number(pref.value);
        return Number.isFinite(parsed) ? parsed : 0;
      }
    } catch (error) {
      console.warn('[API] Error reading dashboard balance from Preferences:', error);
    }

    try {
      const raw = localStorage.getItem(this.dashboardBalanceKey);
      if (raw !== null) {
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : 0;
      }
    } catch (error) {
      console.warn('[API] Error reading dashboard balance from localStorage:', error);
    }

    return 0;
  }

  async setDashboardBalanceLocal(value: number): Promise<number> {
    const normalized = Number.isFinite(value) ? value : 0;
    const serialized = String(normalized);

    await Preferences.set({
      key: this.dashboardBalanceKey,
      value: serialized
    });

    try {
      localStorage.setItem(this.dashboardBalanceKey, serialized);
    } catch (error) {
      console.warn('[API] Error writing dashboard balance to localStorage:', error);
    }

    return normalized;
  }

  private toSafeNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private buildDefaultDashboardBalanceComponents(capitalInicial: number = 0): DashboardBalanceComponents {
    const safeCapital = this.toSafeNumber(capitalInicial);
    const nowIso = new Date().toISOString();

    return {
      capitalInicial: safeCapital,
      ventas: 0,
      transaccionesIngreso: 0,
      transaccionesEgreso: 0,
      gastosFijosPagados: 0,
      ajustes: 0,
      balanceTotal: safeCapital,
      lastMovementAt: null,
      updatedAt: nowIso,
      version: 1
    };
  }

  private computeDashboardBalanceTotal(components: DashboardBalanceComponents): number {
    return this.toSafeNumber(
      this.toSafeNumber(components.capitalInicial) +
      this.toSafeNumber(components.ventas) +
      this.toSafeNumber(components.transaccionesIngreso) -
      this.toSafeNumber(components.transaccionesEgreso) -
      this.toSafeNumber(components.gastosFijosPagados) +
      this.toSafeNumber(components.ajustes)
    );
  }

  private normalizeDashboardBalanceComponents(raw: any): DashboardBalanceComponents {
    const nowIso = new Date().toISOString();
    const normalized: DashboardBalanceComponents = {
      capitalInicial: this.toSafeNumber(raw?.capitalInicial),
      ventas: this.toSafeNumber(raw?.ventas),
      transaccionesIngreso: this.toSafeNumber(raw?.transaccionesIngreso),
      transaccionesEgreso: this.toSafeNumber(raw?.transaccionesEgreso),
      gastosFijosPagados: this.toSafeNumber(raw?.gastosFijosPagados),
      ajustes: this.toSafeNumber(raw?.ajustes),
      balanceTotal: this.toSafeNumber(raw?.balanceTotal),
      lastMovementAt: typeof raw?.lastMovementAt === 'string' ? raw.lastMovementAt : null,
      updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : nowIso,
      version: this.toSafeNumber(raw?.version) || 1
    };

    normalized.balanceTotal = this.computeDashboardBalanceTotal(normalized);
    return normalized;
  }

  private buildDefaultDashboardBalanceAnalysisData(): DashboardBalanceAnalysisData {
    return {
      ingresos: [],
      egresos: [],
      movimientos: [],
      updatedAt: new Date().toISOString(),
      version: 1
    };
  }

  private normalizeMovementType(value: any): DashboardBalanceMovementType {
    switch (value) {
      case 'capital_inicial':
      case 'venta':
      case 'transaccion_ingreso':
      case 'transaccion_egreso':
      case 'gasto_fijo_pagado':
      case 'ajuste_manual':
        return value;
      default:
        return 'ajuste_manual';
    }
  }

  private resolveSignedAmount(
    movementType: DashboardBalanceMovementType,
    amount: number
  ): number {
    const safeAmount = this.toSafeNumber(amount);
    const absAmount = Math.abs(safeAmount);

    switch (movementType) {
      case 'venta':
      case 'transaccion_ingreso':
      case 'capital_inicial':
        return absAmount;
      case 'transaccion_egreso':
      case 'gasto_fijo_pagado':
        return -absAmount;
      case 'ajuste_manual':
      default:
        return safeAmount;
    }
  }

  private resolveMovementFlow(
    movementType: DashboardBalanceMovementType,
    signedAmount: number,
    fallbackFlow?: any
  ): DashboardBalanceFlow {
    if (fallbackFlow === 'income' || fallbackFlow === 'expense' || fallbackFlow === 'neutral') {
      return fallbackFlow;
    }

    switch (movementType) {
      case 'venta':
      case 'transaccion_ingreso':
        return 'income';
      case 'transaccion_egreso':
      case 'gasto_fijo_pagado':
        return 'expense';
      case 'capital_inicial':
        return 'neutral';
      case 'ajuste_manual':
      default:
        if (signedAmount > 0) return 'income';
        if (signedAmount < 0) return 'expense';
        return 'neutral';
    }
  }

  private normalizeDashboardBalanceMovementRecord(raw: any): DashboardBalanceMovementRecord {
    const movementType = this.normalizeMovementType(raw?.movementType);
    const amount = Math.abs(this.toSafeNumber(raw?.amount));
    const signedFallback = this.resolveSignedAmount(movementType, amount);
    const amountSignedCandidate = this.toSafeNumber(raw?.amountSigned);
    const amountSigned = amountSignedCandidate !== 0 ? amountSignedCandidate : signedFallback;
    const createdAt = typeof raw?.createdAt === 'string' && raw.createdAt.trim()
      ? raw.createdAt
      : new Date().toISOString();

    return {
      id: typeof raw?.id === 'string' && raw.id.trim()
        ? raw.id
        : `${movementType}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      movementType,
      flow: this.resolveMovementFlow(movementType, amountSigned, raw?.flow),
      amount,
      amountSigned,
      createdAt,
      idNegocio: typeof raw?.idNegocio === 'string' ? raw.idNegocio : undefined,
      description: typeof raw?.description === 'string' ? raw.description : undefined,
      category: typeof raw?.category === 'string' ? raw.category : undefined,
      source: typeof raw?.source === 'string' ? raw.source : undefined,
      metadata: raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : undefined
    };
  }

  private normalizeDashboardBalanceAnalysisData(raw: any): DashboardBalanceAnalysisData {
    const fallback = this.buildDefaultDashboardBalanceAnalysisData();
    const rawMovements = Array.isArray(raw?.movimientos) ? raw.movimientos : [];
    const normalizedMovements = rawMovements
      .map((item: any) => this.normalizeDashboardBalanceMovementRecord(item))
      .slice(-this.dashboardBalanceMovementsLimit);

    const rawIngresos = Array.isArray(raw?.ingresos) ? raw.ingresos : [];
    const normalizedIngresos = rawIngresos
      .map((item: any) => this.normalizeDashboardBalanceMovementRecord(item))
      .filter((item: DashboardBalanceMovementRecord) => item.flow === 'income')
      .slice(-this.dashboardBalanceMovementsLimit);

    const rawEgresos = Array.isArray(raw?.egresos) ? raw.egresos : [];
    const normalizedEgresos = rawEgresos
      .map((item: any) => this.normalizeDashboardBalanceMovementRecord(item))
      .filter((item: DashboardBalanceMovementRecord) => item.flow === 'expense')
      .slice(-this.dashboardBalanceMovementsLimit);

    const ingresos = normalizedIngresos.length
      ? normalizedIngresos
      : normalizedMovements
        .filter((item: DashboardBalanceMovementRecord) => item.flow === 'income')
        .slice(-this.dashboardBalanceMovementsLimit);

    const egresos = normalizedEgresos.length
      ? normalizedEgresos
      : normalizedMovements
        .filter((item: DashboardBalanceMovementRecord) => item.flow === 'expense')
        .slice(-this.dashboardBalanceMovementsLimit);

    return {
      ingresos,
      egresos,
      movimientos: normalizedMovements,
      updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : fallback.updatedAt,
      version: this.toSafeNumber(raw?.version) || fallback.version
    };
  }

  async getDashboardBalanceAnalysisLocal(): Promise<DashboardBalanceAnalysisData> {
    try {
      const pref = await Preferences.get({ key: this.dashboardBalanceMovementsKey });
      if (pref.value) {
        const parsed = JSON.parse(pref.value);
        return this.normalizeDashboardBalanceAnalysisData(parsed);
      }
    } catch (error) {
      console.warn('[API] Error reading balance analysis from Preferences:', error);
    }

    try {
      const raw = localStorage.getItem(this.dashboardBalanceMovementsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return this.normalizeDashboardBalanceAnalysisData(parsed);
      }
    } catch (error) {
      console.warn('[API] Error reading balance analysis from localStorage:', error);
    }

    return this.buildDefaultDashboardBalanceAnalysisData();
  }

  async setDashboardBalanceAnalysisLocal(
    data: DashboardBalanceAnalysisData
  ): Promise<DashboardBalanceAnalysisData> {
    const normalized = this.normalizeDashboardBalanceAnalysisData(data);
    normalized.updatedAt = new Date().toISOString();
    normalized.version = (this.toSafeNumber(normalized.version) || 1) + 1;

    const serialized = JSON.stringify(normalized);

    await Preferences.set({
      key: this.dashboardBalanceMovementsKey,
      value: serialized
    });

    try {
      localStorage.setItem(this.dashboardBalanceMovementsKey, serialized);
    } catch (error) {
      console.warn('[API] Error writing balance analysis to localStorage:', error);
    }

    return normalized;
  }

  private async appendDashboardBalanceMovementLocal(
    movement: DashboardBalanceMovementRecord
  ): Promise<DashboardBalanceAnalysisData> {
    const current = await this.getDashboardBalanceAnalysisLocal();
    const normalizedMovement = this.normalizeDashboardBalanceMovementRecord(movement);

    const nextMovimientos = [...current.movimientos, normalizedMovement]
      .slice(-this.dashboardBalanceMovementsLimit);
    const nextIngresos = normalizedMovement.flow === 'income'
      ? [...current.ingresos, normalizedMovement].slice(-this.dashboardBalanceMovementsLimit)
      : current.ingresos.slice(-this.dashboardBalanceMovementsLimit);
    const nextEgresos = normalizedMovement.flow === 'expense'
      ? [...current.egresos, normalizedMovement].slice(-this.dashboardBalanceMovementsLimit)
      : current.egresos.slice(-this.dashboardBalanceMovementsLimit);

    return this.setDashboardBalanceAnalysisLocal({
      ingresos: nextIngresos,
      egresos: nextEgresos,
      movimientos: nextMovimientos,
      updatedAt: new Date().toISOString(),
      version: current.version
    });
  }

  private filterDashboardMovementsByRange(
    movements: DashboardBalanceMovementRecord[],
    startIso: string,
    endIso: string
  ): DashboardBalanceMovementRecord[] {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return [];

    return movements.filter((movement) => {
      const movementTs = new Date(movement.createdAt).getTime();
      return Number.isFinite(movementTs) && movementTs >= start && movementTs <= end;
    });
  }

  async getDashboardBalanceComponentsLocal(): Promise<DashboardBalanceComponents> {
    try {
      const pref = await Preferences.get({ key: this.dashboardBalanceComponentsKey });
      if (pref.value) {
        const parsed = JSON.parse(pref.value);
        return this.normalizeDashboardBalanceComponents(parsed);
      }
    } catch (error) {
      console.warn('[API] Error reading balance components from Preferences:', error);
    }

    try {
      const raw = localStorage.getItem(this.dashboardBalanceComponentsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return this.normalizeDashboardBalanceComponents(parsed);
      }
    } catch (error) {
      console.warn('[API] Error reading balance components from localStorage:', error);
    }

    const legacyBalance = await this.getDashboardBalanceLocal();
    if (legacyBalance !== 0) {
      const migrated = this.buildDefaultDashboardBalanceComponents(0);
      migrated.ajustes = legacyBalance;
      migrated.balanceTotal = this.computeDashboardBalanceTotal(migrated);
      migrated.updatedAt = new Date().toISOString();
      await this.setDashboardBalanceComponentsLocal(migrated);
      return migrated;
    }

    return this.buildDefaultDashboardBalanceComponents(0);
  }

  async setDashboardBalanceComponentsLocal(
    components: DashboardBalanceComponents
  ): Promise<DashboardBalanceComponents> {
    const normalized = this.normalizeDashboardBalanceComponents(components);
    normalized.updatedAt = new Date().toISOString();
    normalized.balanceTotal = this.computeDashboardBalanceTotal(normalized);

    const serialized = JSON.stringify(normalized);

    await Preferences.set({
      key: this.dashboardBalanceComponentsKey,
      value: serialized
    });

    try {
      localStorage.setItem(this.dashboardBalanceComponentsKey, serialized);
    } catch (error) {
      console.warn('[API] Error writing balance components to localStorage:', error);
    }

    await this.setDashboardBalanceLocal(normalized.balanceTotal);
    return normalized;
  }

  async initializeDashboardBalanceFromCapital(capitalInicial: number): Promise<DashboardBalanceComponents> {
    const base = this.buildDefaultDashboardBalanceComponents(this.toSafeNumber(capitalInicial));
    return this.setDashboardBalanceComponentsLocal(base);
  }

  async setDashboardInitialCapital(capitalInicial: number): Promise<DashboardBalanceComponents> {
    const components = await this.getDashboardBalanceComponentsLocal();
    components.capitalInicial = this.toSafeNumber(capitalInicial);
    components.lastMovementAt = new Date().toISOString();
    return this.setDashboardBalanceComponentsLocal(components);
  }

  async registerDashboardBalanceMovement(
    movementType: DashboardBalanceMovementType,
    amount: number,
    movementMeta: DashboardBalanceMovementMetadata = {}
  ): Promise<DashboardBalanceComponents> {
    const components = await this.getDashboardBalanceComponentsLocal();
    const signedAmount = this.resolveSignedAmount(movementType, amount);
    const absAmount = Math.abs(this.toSafeNumber(amount));
    const movementTimestamp = new Date().toISOString();

    switch (movementType) {
      case 'capital_inicial':
        components.capitalInicial = absAmount;
        break;
      case 'venta':
        components.ventas += absAmount;
        break;
      case 'transaccion_ingreso':
        components.transaccionesIngreso += absAmount;
        break;
      case 'transaccion_egreso':
        components.transaccionesEgreso += absAmount;
        break;
      case 'gasto_fijo_pagado':
        components.gastosFijosPagados += absAmount;
        break;
      case 'ajuste_manual':
      default:
        components.ajustes += signedAmount;
        break;
    }

    components.lastMovementAt = movementTimestamp;
    const updatedComponents = await this.setDashboardBalanceComponentsLocal(components);

    await this.appendDashboardBalanceMovementLocal({
      id: `${movementType}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      movementType,
      flow: this.resolveMovementFlow(movementType, signedAmount),
      amount: absAmount,
      amountSigned: signedAmount,
      createdAt: movementTimestamp,
      idNegocio: movementMeta.idNegocio,
      description: movementMeta.description,
      category: movementMeta.category,
      source: movementMeta.source || 'finance_frontend',
      metadata: movementMeta.metadata
    });

    return updatedComponents;
  }

  async applyDeltaToDashboardBalance(delta: number): Promise<number> {
    const updated = await this.registerDashboardBalanceMovement('ajuste_manual', delta);
    return updated.balanceTotal;
  }

  async getDashboardWeeklySyncPayload(): Promise<any> {
    const components = await this.getDashboardBalanceComponentsLocal();
    const analysis = await this.getDashboardBalanceAnalysisLocal();
    const now = new Date();

    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    weekStart.setDate(weekStart.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartIso = weekStart.toISOString();
    const weekEndIso = weekEnd.toISOString();
    const weeklyMovimientos = this.filterDashboardMovementsByRange(
      analysis.movimientos,
      weekStartIso,
      weekEndIso
    );
    const weeklyIngresos = this.filterDashboardMovementsByRange(
      analysis.ingresos,
      weekStartIso,
      weekEndIso
    );
    const weeklyEgresos = this.filterDashboardMovementsByRange(
      analysis.egresos,
      weekStartIso,
      weekEndIso
    );

    return {
      generatedAt: now.toISOString(),
      period: {
        type: 'weekly',
        weekStart: weekStartIso,
        weekEnd: weekEndIso
      },
      balanceTotal: components.balanceTotal,
      components,
      ingresos: analysis.ingresos,
      egresos: analysis.egresos,
      movimientos: analysis.movimientos,
      weeklyIngresos,
      weeklyEgresos,
      weeklyMovimientos
    };
  }

  private getIsoWeekKey(date: Date = new Date()): string {
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  private getWeekRange(reference: Date = new Date()): { weekStart: string; weekEnd: string } {
    const weekStart = new Date(reference);
    const day = weekStart.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    weekStart.setDate(weekStart.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString()
    };
  }

  private async getDashboardWeeklySyncStateLocal(): Promise<DashboardWeeklySyncState | null> {
    try {
      const pref = await Preferences.get({ key: this.dashboardWeeklySyncStateKey });
      if (pref.value) {
        return JSON.parse(pref.value) as DashboardWeeklySyncState;
      }
    } catch (error) {
      console.warn('[API] Error reading weekly sync state from Preferences:', error);
    }

    try {
      const raw = localStorage.getItem(this.dashboardWeeklySyncStateKey);
      if (raw) {
        return JSON.parse(raw) as DashboardWeeklySyncState;
      }
    } catch (error) {
      console.warn('[API] Error reading weekly sync state from localStorage:', error);
    }

    return null;
  }

  private async setDashboardWeeklySyncStateLocal(state: DashboardWeeklySyncState): Promise<void> {
    const serialized = JSON.stringify(state);

    await Preferences.set({
      key: this.dashboardWeeklySyncStateKey,
      value: serialized
    });

    try {
      localStorage.setItem(this.dashboardWeeklySyncStateKey, serialized);
    } catch (error) {
      console.warn('[API] Error writing weekly sync state to localStorage:', error);
    }
  }

  private async postDashboardWeeklySnapshotToBackend(
    snapshot: DashboardWeeklySnapshot,
    idToken: string
  ): Promise<any> {
    const url = `${this.baseUrl}${this.dashboardWeeklySyncEndpoint}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    });

    const response = await this.http.post<any>(url, snapshot, { headers })
      .pipe(timeout(this.requestTimeout))
      .toPromise();

    console.log('[SCHEDULER] Weekly dashboard data synced to backend:', {
      endpoint: url,
      payload: snapshot,
      response
    });

    return response;
  }

  private extractSyncedBalanceId(response: any): string | null {
    const value =
      response?.data?.idBalance ||
      response?.data?.idSnapshot ||
      response?.data?.id ||
      response?.idBalance ||
      response?.idSnapshot ||
      response?.id;

    if (typeof value === 'string' && value.trim()) return value;
    return null;
  }

  async runWeeklyDashboardSyncIfNeeded(): Promise<{
    status: 'synced' | 'skipped' | 'disabled';
    reason?: string;
    snapshot?: DashboardWeeklySnapshot;
  }> {
    console.log('[SCHEDULER] Checking weekly dashboard sync...');

    const idToken = await this.getToken();
    const uid = await this.getUid();

    if (!idToken || !uid) {
      console.log('[SCHEDULER] Skipped weekly sync: no_auth_session');
      return { status: 'skipped', reason: 'no_auth_session' };
    }

    let idNegocio = '';
    try {
      const businesses = await this.getBusinessByUserId(uid);
      const firstBusiness = businesses?.[0];
      idNegocio = firstBusiness?.['idNegocio'] || firstBusiness?.['id'] || '';
    } catch {
      console.log('[SCHEDULER] Skipped weekly sync: business_lookup_failed');
      return { status: 'skipped', reason: 'business_lookup_failed' };
    }

    if (!idNegocio) {
      console.log('[SCHEDULER] Skipped weekly sync: no_business');
      return { status: 'skipped', reason: 'no_business' };
    }

    const weekKey = this.getIsoWeekKey();
    const weekRange = this.getWeekRange();
    const components = await this.getDashboardBalanceComponentsLocal();
    const analysis = await this.getDashboardBalanceAnalysisLocal();
    const nowIso = new Date().toISOString();
    const weeklyMovimientos = this.filterDashboardMovementsByRange(
      analysis.movimientos,
      weekRange.weekStart,
      weekRange.weekEnd
    );
    const weeklyIngresos = this.filterDashboardMovementsByRange(
      analysis.ingresos,
      weekRange.weekStart,
      weekRange.weekEnd
    );
    const weeklyEgresos = this.filterDashboardMovementsByRange(
      analysis.egresos,
      weekRange.weekStart,
      weekRange.weekEnd
    );
    const previewPayload = {
      uid,
      idNegocio,
      weekKey,
      weekStart: weekRange.weekStart,
      weekEnd: weekRange.weekEnd,
      generatedAt: nowIso,
      source: 'dashboard',
      balanceTotal: components.balanceTotal,
      components,
      ingresos: analysis.ingresos,
      egresos: analysis.egresos,
      movimientos: analysis.movimientos,
      weeklyIngresos,
      weeklyEgresos,
      weeklyMovimientos
    };
    console.log('[SCHEDULER] Weekly payload preview:', previewPayload);

    const lastState = await this.getDashboardWeeklySyncStateLocal();
    if (lastState?.weekKey === weekKey && lastState?.idNegocio === idNegocio) {
      console.log('[SCHEDULER] Skipped weekly sync: already_synced_this_week', { weekKey, idNegocio });
      return { status: 'skipped', reason: 'already_synced_this_week' };
    }
    const safeSnapshotId = `${idNegocio}_${weekKey}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_');

    const snapshot: DashboardWeeklySnapshot = {
      idSnapshot: safeSnapshotId,
      uid,
      idNegocio,
      weekKey,
      weekStart: weekRange.weekStart,
      weekEnd: weekRange.weekEnd,
      generatedAt: nowIso,
      syncedAt: nowIso,
      source: 'dashboard',
      balanceTotal: components.balanceTotal,
      components,
      ingresos: analysis.ingresos,
      egresos: analysis.egresos,
      movimientos: analysis.movimientos,
      weeklyIngresos,
      weeklyEgresos,
      weeklyMovimientos
    };

    const syncResponse = await this.postDashboardWeeklySnapshotToBackend(snapshot, idToken);
    const syncedBalanceId = this.extractSyncedBalanceId(syncResponse) || snapshot.idSnapshot;

    await this.setDashboardWeeklySyncStateLocal({
      weekKey,
      idNegocio,
      snapshotId: syncedBalanceId,
      syncedAt: nowIso
    });

    console.log('[SCHEDULER] Weekly sync completed:', {
      weekKey,
      idNegocio,
      snapshotId: syncedBalanceId
    });

    return { status: 'synced', snapshot };
  }

  async getDashboardWeeklySyncStatus(idNegocio: string): Promise<DashboardWeeklySyncStatus> {
    const safeBusinessId = (idNegocio || '').trim();
    const currentWeekKey = this.getIsoWeekKey();
    const lastState = await this.getDashboardWeeklySyncStateLocal();

    const sameBusiness = !!safeBusinessId && lastState?.idNegocio === safeBusinessId;
    const lastSyncedWeekKey = sameBusiness ? (lastState?.weekKey || null) : null;
    const lastSyncedAt = sameBusiness ? (lastState?.syncedAt || null) : null;
    const pending = !!safeBusinessId && lastSyncedWeekKey !== currentWeekKey;

    return {
      idNegocio: safeBusinessId,
      currentWeekKey,
      lastSyncedWeekKey,
      lastSyncedAt,
      pending
    };
  }

  async createBalanceSemanal(snapshot: Partial<DashboardWeeklySnapshot>): Promise<any> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}${this.dashboardWeeklySyncEndpoint}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, snapshot, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();

      return response;
    } catch (error: any) {
      throw this.handleHttpError(error);
    }
  }

  async getBalancesSemanales(): Promise<any[]> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/balance-semanal/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<{ message?: string; data?: any[] }>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      if (Array.isArray(response)) return response;
      return response?.data || [];
    } catch (error: any) {
      if (error?.status === 404) return [];
      throw this.handleHttpError(error);
    }
  }

  async getBalancesSemanalesByBusiness(idNegocio: string): Promise<any[]> {
    if (!idNegocio || !idNegocio.trim()) {
      throw new Error('El ID del negocio no puede estar vacio.');
    }

    try {
      const token = await this.getToken();
      if (!token) throw new Error('Usuario no autenticado.');

      const url = `${this.baseUrl}/balance-semanal/negocio/${idNegocio}`;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response = await this.http.get<{ message?: string; data?: any[] }>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      if (Array.isArray(response)) return response;
      return response?.data || [];
    } catch (error: any) {
      if (error?.status === 404) return [];
      if (error?.status === 500) {
        console.warn('[API] balance-semanal por negocio devolvio 500, usando fallback local por filtro:', {
          idNegocio
        });

        try {
          const allBalances = await this.getBalancesSemanales();
          return (allBalances || []).filter((item: any) => {
            const businessId = item?.idNegocio || item?.negocioId || item?.idBusiness;
            return businessId === idNegocio;
          });
        } catch (fallbackError) {
          console.error('[API] Fallback de balances semanales tambien fallo:', fallbackError);
          return [];
        }
      }

      throw this.handleHttpError(error);
    }
  }

  async generateBalancePdf(idBalance: string): Promise<any> {
    if (!idBalance || !idBalance.trim()) {
      throw new Error('El ID del balance es requerido.');
    }

    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}${this.balancePdfEndpoint}/generar/${idBalance}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, {}, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      return response;
    } catch (error: any) {
      throw this.handleHttpError(error);
    }
  }

  async getBalancePdfReportsByBusiness(idNegocio: string): Promise<any[]> {
    if (!idNegocio || !idNegocio.trim()) {
      throw new Error('El ID del negocio no puede estar vacio.');
    }

    try {
      const token = await this.getToken();
      if (!token) throw new Error('Usuario no autenticado.');

      const url = `${this.baseUrl}${this.balancePdfEndpoint}/negocio/${idNegocio}`;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response = await this.http.get<{ message?: string; data?: any[] }>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();

      if (Array.isArray(response)) return response;
      return response?.data || [];
    } catch (error: any) {
      if (error?.status === 404) return [];
      if (error?.status === 500) {
        console.warn('[API] balance-pdf por negocio devolvio 500, intentando fallback por listado global:', {
          idNegocio
        });

        try {
          const token = await this.getToken();
          if (!token) throw new Error('Usuario no autenticado.');

          const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          });

          const fallbackUrl = `${this.baseUrl}${this.balancePdfEndpoint}/`;
          const fallbackResponse = await this.http.get<{ message?: string; data?: any[] }>(fallbackUrl, { headers })
            .pipe(timeout(this.requestTimeout))
            .toPromise();

          const list = Array.isArray(fallbackResponse)
            ? fallbackResponse
            : (fallbackResponse?.data || []);

          return (list || []).filter((item: any) => {
            const businessId = item?.idNegocio || item?.negocioId || item?.idBusiness;
            return businessId === idNegocio;
          });
        } catch (fallbackError: any) {
          if (fallbackError?.status === 404) return [];
          console.error('[API] Fallback de reportes PDF tambien fallo:', fallbackError);
          return [];
        }
      }

      throw this.handleHttpError(error);
    }
  }

  startWeeklyDashboardSyncScheduler(intervalMs: number = 6 * 60 * 60 * 1000): void {
    if (this.dashboardWeeklySyncTimer) {
      console.log('[SCHEDULER] Scheduler already running');
      return;
    }

    console.log('[SCHEDULER] Starting weekly scheduler', { intervalMs });

    this.runWeeklyDashboardSyncIfNeeded().catch((error) => {
      console.warn('[API] Initial weekly dashboard sync failed:', error);
    });

    this.dashboardWeeklySyncTimer = setInterval(() => {
      this.runWeeklyDashboardSyncIfNeeded().catch((error) => {
        console.warn('[API] Scheduled weekly dashboard sync failed:', error);
      });
    }, intervalMs);
  }

  stopWeeklyDashboardSyncScheduler(): void {
    if (!this.dashboardWeeklySyncTimer) return;
    clearInterval(this.dashboardWeeklySyncTimer);
    this.dashboardWeeklySyncTimer = null;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.error && error.error.error && error.error.error.message) {
        errorMessage = this.parseFirebaseError(error.error.error.message);
      } else {
        errorMessage = `Error ${error.status}: ${error.message}`;
      }
    }

    console.error('HTTP Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // ðŸ”¹ Manejo especÃ­fico de errores HTTP para async/await
  private handleHttpError(error: any): Error {
    if (error.name === 'TimeoutError') {
      return new Error('Tiempo de espera agotado. Verifica tu conexiÃ³n a internet.');
    }

    if (error.status === 0) {
      console.log('[API] Sin conexiÃ³n a internet.');
      return new Error('Sin conexiÃ³n a internet.');
    }

    if (error.error && error.error.error && error.error.error.message) {
      return new Error(this.parseFirebaseError(error.error.error.message));
    }

    if (error.message) {
      return new Error(error.message);
    }

    console.log('[API] Error en el servidor.');
    return new Error('Error en el servidor.');
  }

  // ðŸ”¹ Parsear errores de Firebase para mensajes mÃ¡s claros
  private parseFirebaseError(message: string): string {
    switch (message) {
      case 'EMAIL_EXISTS':
        return 'El correo ya estÃ¡ registrado.';
      case 'EMAIL_NOT_FOUND':
        return 'Correo no encontrado.';
      case 'INVALID_PASSWORD':
        return 'ContraseÃ±a incorrecta.';
      case 'USER_DISABLED':
        return 'Cuenta deshabilitada.';
      case 'TOO_MANY_ATTEMPTS_TRY_LATER':
        return 'Demasiados intentos, intenta mÃ¡s tarde.';
      case 'WEAK_PASSWORD':
        return 'La contraseÃ±a es muy dÃ©bil.';
      case 'INVALID_EMAIL':
        return 'El formato del correo es invÃ¡lido.';
      default:
        return `Error: ${message}`;
    }
  }

  // ðŸ”¹ MÃ©todos adicionales para funcionalidades especÃ­ficas del negocio

  // Obtener email del usuario desde Firebase Auth
  async getUserEmail(uid: string): Promise<string | null> {
    if (!uid || uid.trim() === '') {
      throw new Error('El UID no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/users/${uid}/email`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      console.log('ðŸ“§ [GET_USER_EMAIL] Obteniendo email del usuario:', uid);
      
      const response = await this.http.get<{ message: string, email: string | null }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();
      
      console.log('âœ… [GET_USER_EMAIL] Email obtenido:', response?.email);
      return response?.email || null;
    } catch (error) {
      console.error('âŒ [GET_USER_EMAIL] Error obteniendo email:', error);
      // No lanzar error, simplemente retornar null si no se puede obtener
      return null;
    }
  }

  // Crear usuario en el backend despuÃ©s del onboarding
  async createUser(userData: { name: string, birthdate: string, numeroDeTelefono: string }): Promise<any> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/users/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      console.log('ðŸš€ [CREATE_USER] Enviando datos al backend:', userData);
      
      const response = await this.http.post<any>(url, userData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();
      
      console.log('âœ… [CREATE_USER] Usuario creado exitosamente:', response);
      return response;
    } catch (error) {
      console.error('âŒ [CREATE_USER] Error creando usuario:', error);
      throw this.handleHttpError(error);
    }
  }

  // Actualizar datos del usuario
  async updateUser(uid: string, userData: any): Promise<any> {
    if (!uid || uid.trim() === '') {
      throw new Error('El UID no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/users/${uid}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.put<any>(url, userData, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Obtener productos por negocio
  async getProductsByBusiness(idNegocio: string): Promise<any[]> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product/business/${idNegocio}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response?.data || [];
    } catch (error: any) {
      if (error.status === 404) {
        return []; // No products found for this business
      }
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Crear producto
  async createProduct(productData: {
    idNegocio: string;
    nombreProducto: string;
    precioVenta: number;
    costoProduccion: number;
    stock: number;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, productData, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response?.data;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Disminuir stock de producto
  async decreaseStock(idProducto: string, cantidad: number): Promise<any> {
    if (!idProducto || !cantidad) {
      throw new Error('ID del producto y cantidad son requeridos.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product/decrease-stock`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const body = {
      idProducto,
      cantidad
    };

    try {
      const response = await this.http.post<any>(url, body, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // Obtener datos de productos (deprecated - use getProductsByBusiness instead)
  async getProducts(): Promise<any[]> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/products`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any[]>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response || [];
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // Actualizar producto
  async updateProduct(productId: string, productData: any, businessId?: string): Promise<any> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/product/${productId}`;
    console.log('[API] ðŸ”„ UPDATE PRODUCT URL:', url);
    console.log('[API] ðŸ“‹ Product ID:', productId);
    console.log('[API] ðŸ¢ Business ID:', businessId);
    console.log('[API] ðŸ“¤ Original Product Data:', productData);
    
    // Crear el objeto de datos igual que en Postman
    const dataToSend = {
      idNegocio: businessId,
      nombreProducto: productData.nombreProducto,
      precioVenta: productData.precioVenta,
      costoProduccion: productData.costoProduccion,
      stock: productData.stock
    };
    
    console.log('[API] ðŸ“¤ Final Data to Send (Postman format):', dataToSend);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.put<any>(url, dataToSend, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();
      
      console.log('[API] âœ… UPDATE PRODUCT RESPONSE:', response);
      return response;
    } catch (error: any) {
      console.error('[API] âŒ UPDATE PRODUCT ERROR:', error);
      console.error('[API] âŒ Error status:', error.status);
      console.error('[API] âŒ Error message:', error.message);
      console.error('[API] âŒ Full error object:', error);
      
      if (error.status === 404) {
        console.error('[API] ðŸš¨ 404 ANALYSIS:');
        console.error('- URL being called:', url);
        console.error('- Expected backend route: PUT /api/product/:idProducto');
        console.error('- Router registration: app.use(\'/api/product\', productRoutes)');
        console.error('- Router method: router.put(\'/:idProducto\', verifyFirebaseToken, updateProduct)');
        console.error('- Possible causes:');
        console.error('  1. verifyFirebaseToken middleware is rejecting the token');
        console.error('  2. updateProduct function is not found');
        console.error('  3. Product does not exist in Firestore');
        console.error('  4. Route is not properly registered');
      }
      
      throw this.handleHttpError(error);
    }
  }

  // Eliminar producto
  async deleteProduct(productId: string): Promise<any> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/product/${productId}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.delete<any>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Crear transacciÃ³n financiera
  async createTransaction(transactionData: {
    idNegocio: string;
    tipo: 'income' | 'expense' | 'ingreso' | 'egreso' | boolean | number;
    monto: number;
    descripcion?: string;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/transaction/`;
    console.log('[API] ðŸ’° CREATE TRANSACTION URL:', url);
    
    // Normalizar el tipo segÃºn la lÃ³gica del backend
    let tipoNormalizado: number;
    
    if (typeof transactionData.tipo === 'boolean') {
      // Si es booleano: false = ingreso (0), true = egreso (1)
      tipoNormalizado = transactionData.tipo ? 1 : 0;
    } else if (typeof transactionData.tipo === 'number') {
      // Si es nÃºmero: 0 = ingreso, 1 = egreso
      tipoNormalizado = transactionData.tipo;
    } else if (typeof transactionData.tipo === 'string') {
      // Si es string: convertir a nÃºmero segÃºn las reglas del backend
      const tipoStr = transactionData.tipo.toLowerCase();
      if (tipoStr === 'income' || tipoStr === 'ingreso') {
        tipoNormalizado = 0; // ingreso
      } else if (tipoStr === 'expense' || tipoStr === 'egreso') {
        tipoNormalizado = 1; // egreso
      } else {
        throw new Error('Tipo invÃ¡lido. Usa "income"/"expense" o "ingreso"/"egreso"');
      }
    } else {
      throw new Error('Tipo invÃ¡lido. Debe ser string, boolean o number');
    }

    // Preparar datos para enviar al backend
    const dataToSend = {
      idNegocio: transactionData.idNegocio,
      tipo: tipoNormalizado, // Enviar como nÃºmero (0 o 1)
      monto: transactionData.monto,
      descripcion: transactionData.descripcion || ''
    };
    
    console.log('[API] ðŸ“¤ Transaction Data (normalized):', dataToSend);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, dataToSend, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] âœ… Transaction created successfully:', response);
      return response;
    } catch (error: any) {
      console.error('[API] âŒ Error creating transaction:', error);
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Obtener transacciones por negocio
  // Crear venta de producto
  async createVenta(ventaData: {
    idNegocio: string;
    idProducto: string;
    cantidadVendida: number;
    precioUnitario: number;
    costoProduccion: number;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product-sold/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, ventaData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // Obtener ventas por producto
  async getVentasByProducto(idProducto: string): Promise<any[]> {
    if (!idProducto || idProducto.trim() === '') {
      throw new Error('El ID del producto no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product-sold/ventas/producto/${idProducto}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<{ message: string; data: any[] }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response?.data || [];
    } catch (error: any) {
      if (error.status === 404) {
        return [];
      }
      throw this.handleHttpError(error);
    }
  }

  // Obtener ventas por producto en un mes
  async getVentasByProductoEnMes(idProducto: string, year: number, month: number): Promise<any[]> {
    if (!idProducto || idProducto.trim() === '') {
      throw new Error('El ID del producto no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product-sold/ventas/producto/${idProducto}/${year}/${month}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<{ message: string; data: any[] }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response?.data || [];
    } catch (error: any) {
      if (error.status === 404) {
        return [];
      }
      throw this.handleHttpError(error);
    }
  }

  // Obtener resumen de ventas por producto en un mes
  async getResumenVentasByProductoEnMes(idProducto: string, year: number, month: number): Promise<any> {
    if (!idProducto || idProducto.trim() === '') {
      throw new Error('El ID del producto no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product-sold/ventas/producto/resumen/${idProducto}/${year}/${month}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // Obtener resumen de ventas por negocio en un mes
  async getResumenVentasByNegocioEnMes(idNegocio: string, year: number, month: number): Promise<any> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product-sold/ventas/producto/negocio/${idNegocio}/${year}/${month}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  async getRentabilidadLive(idNegocio: string, year: number, month: number): Promise<any> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/rentabilidad/live/${idNegocio}/${year}/${month}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();

      return response?.data || response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  async getEgresosByMonthShort(idNegocio: string, year: number, month: number): Promise<any> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/transaction/negocios/${idNegocio}/egresos/${year}/${month}/short`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();

      return response;
    } catch (error: any) {
      if (error?.status === 404) {
        return { totalEgresos: 0, count: 0 };
      }
      throw this.handleHttpError(error);
    }
  }

  async getTransactionsByBusiness(idNegocio: string): Promise<any[]> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/transaction/negocios/${idNegocio}/transacciones`;
    console.log('[API] ðŸ“‹ GET TRANSACTIONS BY BUSINESS URL:', url);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<{ 
        message: string, 
        count: number, 
        data: any[] 
      }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] âœ… Transactions retrieved successfully:', response);
      
      // Procesar los datos para normalizar el tipo segÃºn la interfaz del frontend
      const processedData = (response?.data || []).map(transaction => {
        return {
          ...transaction,
          // Convertir tipo booleano del backend a string para el frontend
          // false = ingreso -> 'income', true = egreso -> 'expense'
          typeString: transaction.tipo === false ? 'income' : 'expense',
          // Mantener el tipo original tambiÃ©n
          tipoOriginal: transaction.tipo,
          // Asegurar que la fecha estÃ© en formato correcto
          date: transaction.fechaISO || transaction.fecha,
          // Agregar propiedades que espera el frontend
          id: transaction.idTransaccion,
          type: transaction.tipo === false ? 'income' : 'expense',
          amount: transaction.monto,
          description: transaction.descripcion || '',
          category: 'General', // Valor por defecto si no viene del backend
          method: 'No especificado', // Valor por defecto si no viene del backend
          status: 'completed' // Valor por defecto
        };
      });

      console.log('[API] ðŸ“Š Processed transactions for frontend:', processedData);
      return processedData;
    } catch (error: any) {
      if (error.status === 404) {
        console.log('[API] â„¹ï¸ No transactions found for business:', idNegocio);
        return [];
      }
      console.error('[API] âŒ Error getting transactions:', error);
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Actualizar negocio
  async updateBusiness(idNegocio: string, businessData: {
    nombreNegocio?: string;
    descripcion?: string;
    sector?: string;
    capitalInicial?: number;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/business/${idNegocio}`;
    console.log('[API] ðŸ¢ UPDATE BUSINESS URL:', url);
    console.log('[API] ðŸ“¤ Business Data:', businessData);
    console.log('[API] ðŸ”‘ Token preview:', token.substring(0, 20) + '...');
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.put<any>(url, businessData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] âœ… Business updated successfully:', response);
      return response;
    } catch (error: any) {
      console.error('[API] âŒ Error updating business:', error);
      
      // Si es error 401, intentar refrescar token
      if (error.message && error.message.includes('401')) {
        console.log('[API] ðŸ”„ Token might be expired, checking authentication...');
        
        // Limpiar token expirado
        await this.logout();
        
        throw new Error('Tu sesiÃ³n ha expirado. Por favor, inicia sesiÃ³n nuevamente.');
      }
      
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Crear gasto fijo
  async createGastoFijo(gastoData: {
    idNegocio: string;
    nombreGasto: string;
    costoGasto: number;
    descripcion: string;
    recurrencia: string;
    fechasEjecucion: Array<string | number>;
    pagado?: boolean;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/gasto-fijo/`;
    console.log('[API] ðŸ’³ CREATE GASTO FIJO URL:', url);
    console.log('[API] ðŸ“¤ Gasto Fijo Data:', gastoData);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, gastoData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] âœ… Gasto fijo created successfully:', response);
      return response;
    } catch (error: any) {
      console.error('[API] âŒ Error creating gasto fijo:', error);
      console.error('[API] âŒ createGastoFijo payload:', gastoData);
      console.error('[API] âŒ createGastoFijo backend response:', error?.error);
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Marcar gasto fijo como pagado
  async markGastoFijoAsPaid(idGasto: string): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/gasto-fijo/${idGasto}/mark-as-paid`;
    console.log('[API] âœ… MARK GASTO FIJO AS PAID URL:', url);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.patch<any>(url, {}, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] âœ… Gasto fijo marked as paid successfully:', response);
      return response;
    } catch (error: any) {
      console.error('[API] âŒ Error marking gasto fijo as paid:', error);
      throw this.handleHttpError(error);
    }
  }

  // ðŸ”¹ Registrar gasto fijo pagado en historial
  async createGastoFijoPagado(gastoPagadoData: {
    idNegocio: string;
    nombreGasto: string;
    costoGasto: number;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/gasto-fijo-pagado/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, gastoPagadoData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();


      return response;
    } catch (error: any) {
      throw this.handleHttpError(error);
    }
  }
  // Get paid fixed expenses history
  async getGastosFijosPagados(): Promise<any[]> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/gasto-fijo-pagado/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<{ message: string; total: number; data: any[] }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response?.data || [];
    } catch (error: any) {
      const is404 =
        error?.status === 404 ||
        (typeof error?.message === 'string' && error.message.includes('404'));

      if (is404) {
        return [];
      }

      throw this.handleHttpError(error);
    }
  }
  async getGastosFijosByBusiness(idNegocio: string): Promise<any[]> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacÃ­o.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/gasto-fijo/business/${idNegocio}`;
    console.log('[API] ðŸ“‹ GET GASTOS FIJOS URL:', url);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<{ message: string, data: any[] }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] âœ… Gastos fijos retrieved successfully:', response);
      return response?.data || [];
    } catch (error: any) {
      const is404 =
        error?.status === 404 ||
        (typeof error?.message === 'string' && error.message.includes('404'));
      if (is404) {
        console.log('[API] No gastos fijos found for business:', idNegocio);
        return [];
      }
      console.error('[API] âŒ Error getting gastos fijos:', error);
      throw this.handleHttpError(error);
    }
  }
}

