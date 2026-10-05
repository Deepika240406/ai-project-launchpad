/**
 * QR helper for the shareable project card.
 *
 * Why a QR code at all: students share images in WhatsApp, and a screenshot of a
 * card cannot be tapped. The QR is what turns a shared image back into a visit
 * to the referral link — it is the difference between a nice picture and a
 * working acquisition asset.
 */
export async function makeQrDataUrl(text: string, size = 220): Promise<string> {
  try {
    // Loaded on demand: the encoder is only needed once a student actually
    // exports a card, so it stays out of the initial bundle on mobile.
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0B0F19', light: '#FFFFFF' },
    });
  } catch {
    return '';
  }
}
