/**
 * Mock-register: hvilke brukere er registrert behandler for hvilke pasienter.
 * I produksjon: erstattes med oppslag mot EPJ-APIet (EPJ-KRAV-04).
 */

import { UserRole } from '../../config/types';

export interface MockUser {
  id: string;
  navn: string;
  rolle: UserRole;
  pasienter: string[];  // pasient-IDer brukeren er behandler for
}

export const MOCK_USERS: MockUser[] = [
  {
    id: 'BRUKER-DR-ANDERSEN',
    navn: 'Dr. Erik Andersen',
    rolle: 'lege',
    pasienter: ['PASIENT-A7F2', 'PASIENT-B3D9'],
  },
  {
    id: 'BRUKER-SYKEPL-BERG',
    navn: 'Sykepleier Mari Berg',
    rolle: 'sykepleier',
    pasienter: ['PASIENT-A7F2'],
  },
  {
    id: 'BRUKER-DR-BAKKE',
    navn: 'Dr. Hilde Bakke',
    rolle: 'lege',
    pasienter: ['PASIENT-C1E5'],
  },
  {
    id: 'BRUKER-SEKR-LIE',
    navn: 'Sekretær Tone Lie',
    rolle: 'sekretær',
    // Sekretærer er ikke behandlere – ingen pasienter her
    // Brukes til å teste at HTTP 403 returneres korrekt
    pasienter: [],
  },
];

/** Hjelpefunksjon: slå opp om bruker er behandler for pasient */
export function isBehandler(userId: string, patientId: string): boolean {
  const user = MOCK_USERS.find((u) => u.id === userId);
  return user?.pasienter.includes(patientId) ?? false;
}

/** Hjelpefunksjon: hent bruker */
export function getUser(userId: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.id === userId);
}
