import { describe, expect, it } from 'vitest';
import { parseQuickAdd } from '../parser';

const today = '2026-11-03'; // martes

describe('entrada rápida', () => {
  it('texto simple', () => {
    const p = parseQuickAdd('Comprar pan', today);
    expect(p.title).toBe('Comprar pan');
    expect(p.date).toBeNull();
    expect(p.recurrence).toBeNull();
  });

  it('fechas relativas y hora', () => {
    const p = parseQuickAdd('Llamar a mamá mañana a las 18:30', today);
    expect(p.title).toBe('Llamar a mamá');
    expect(p.date).toBe('2026-11-04');
    expect(p.time).toBe('18:30');
  });

  it('día de la semana y fecha concreta', () => {
    expect(parseQuickAdd('Dentista el viernes', today).date).toBe('2026-11-06');
    expect(parseQuickAdd('Reunión martes', today).date).toBe('2026-11-10');
    expect(parseQuickAdd('Renovar DNI el 15 de diciembre', today).date).toBe('2026-12-15');
    expect(parseQuickAdd('Pagar seguro 2/1', today).date).toBe('2027-01-02');
  });

  it('recurrencias', () => {
    expect(parseQuickAdd('Leer cada día', today).recurrence).toEqual({ type: 'daily', interval: 1 });
    expect(parseQuickAdd('Regar plantas cada 3 días', today).recurrence).toEqual({ type: 'daily', interval: 3 });
    expect(parseQuickAdd('Gimnasio cada lunes, miércoles y viernes', today).recurrence)
      .toEqual({ type: 'weekly', interval: 1, days: [1, 3, 5] });
    expect(parseQuickAdd('Correo días laborables', today).recurrence)
      .toEqual({ type: 'weekly', interval: 1, days: [1, 2, 3, 4, 5] });
    expect(parseQuickAdd('Pagar alquiler el 1 de cada mes', today).recurrence)
      .toEqual({ type: 'monthly', interval: 1, dayOfMonth: 1 });
    const weekly = parseQuickAdd('Planificar cada semana el domingo', today);
    expect(weekly.recurrence).toEqual({ type: 'weekly', interval: 1, days: [0] });
    expect(weekly.title).toBe('Planificar');
  });

  it('prioridad, lista y etiquetas', () => {
    const p = parseQuickAdd('Preparar informe p1 #Trabajo @foco hoy', today);
    expect(p.title).toBe('Preparar informe');
    expect(p.priority).toBe(1);
    expect(p.listName).toBe('Trabajo');
    expect(p.tags).toEqual(['foco']);
    expect(p.date).toBe(today);
  });

  it('no confunde duraciones con horas', () => {
    const p = parseQuickAdd('Estudiar 2h', today);
    expect(p.time).toBeNull();
    expect(p.title).toBe('Estudiar 2h');
  });

  it('"por la mañana" no es una fecha', () => {
    expect(parseQuickAdd('Correr por la mañana', today).date).toBeNull();
  });
});
