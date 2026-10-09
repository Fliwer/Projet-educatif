export class ErreurMetier extends Error {
  statut: number;
  constructor(message: string, statut = 400) {
    super(message);
    this.name = "ErreurMetier";
    this.statut = statut;
  }
}
