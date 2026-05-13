export interface VideoClip {
  readonly id: string;
  readonly filePath: string;
  readonly durationMs: number;
  readonly trimStartMs: number;
  readonly trimEndMs: number;
  readonly orderIndex: number;
  readonly color: string; // hex auto-assegnato dalla palette
  readonly width: number; // 0 se non disponibile
  readonly height: number; // 0 se non disponibile
}
