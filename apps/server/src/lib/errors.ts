/** Erreur métier transformée en réponse HTTP générique par le error handler. */
export class AppError extends Error {
  constructor(
    readonly statusCode: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429,
    readonly publicMessage: string,
  ) {
    super(publicMessage)
    this.name = 'AppError'
  }
}

export const notFound = () => new AppError(404, 'Ressource introuvable')
export const forbidden = () => new AppError(403, 'Accès refusé')
export const unauthorized = () => new AppError(401, 'Authentification requise')
export const badRequest = (msg = 'Requête invalide') => new AppError(400, msg)
