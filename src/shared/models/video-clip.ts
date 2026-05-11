export interface VideoClip {
  readonly id: string;
  readonly filePath: string;
  readonly durationMs: number;
  readonly trimStartMs: number;
  readonly trimEndMs: number;
  readonly orderIndex: number;
}
