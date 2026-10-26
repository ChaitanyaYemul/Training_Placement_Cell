/** Pre-render the smoke texture once instead of blurring the full viewport. */
export function createSmokeTexture() {
  const texture = document.createElement('canvas');
  texture.width = texture.height = 96;
  const context = texture.getContext('2d');
  if (!context) return null;
  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, 'rgba(85, 182, 237, 0.26)');
  gradient.addColorStop(0.3, 'rgba(112, 202, 248, 0.19)');
  gradient.addColorStop(0.65, 'rgba(163, 224, 252, 0.08)');
  gradient.addColorStop(1, 'rgba(198, 237, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);
  return texture;
}

export function drawSmoke(context, texture, puff) {
  const progress = puff.age / puff.duration;
  const radius = puff.radius * (0.55 + progress * 1.8);
  const curl = Math.sin(progress * 5 + puff.phase) * progress * 17;
  context.save();
  context.globalAlpha = (1 - progress) ** 1.6;
  context.translate(puff.x + curl, puff.y - progress * 22);
  context.rotate(puff.angle + progress * puff.turn);
  context.scale(1.3, 0.75);
  context.drawImage(texture, -radius, -radius, radius * 2, radius * 2);
  context.restore();
}

/** Original vector wings, drawn locally without image downloads or libraries. */
export function drawButterfly(context, butterfly, time, opacity) {
  const opening =
    0.25 + Math.abs(Math.sin(time * 0.017 + butterfly.phase)) * 0.75;
  context.save();
  context.globalAlpha = opacity * 0.8;
  context.translate(butterfly.x, butterfly.y);
  context.rotate(butterfly.angle + Math.PI / 2);
  context.scale(butterfly.size, butterfly.size);
  const wing = context.createLinearGradient(-14, -12, 12, 12);
  wing.addColorStop(0, '#b9e8ff');
  wing.addColorStop(0.55, '#6ec8f2');
  wing.addColorStop(1, '#259bd7');
  context.fillStyle = wing;
  context.strokeStyle = 'rgba(34, 137, 193, 0.45)';
  context.lineWidth = 0.65;
  context.save();
  context.scale(opening, 1);
  for (const direction of [-1, 1]) {
    context.save();
    context.scale(direction, 1);
    context.beginPath();
    context.moveTo(0, -2);
    context.bezierCurveTo(5, -12, 18, -17, 15, -5);
    context.bezierCurveTo(15, 0, 8, 4, 2, 3);
    context.bezierCurveTo(13, 1, 13, 13, 6, 10);
    context.bezierCurveTo(2, 9, 0, 5, 0, -2);
    context.fill();
    context.stroke();
    context.restore();
  }
  context.restore();
  context.strokeStyle = '#2788b8';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, -5);
  context.quadraticCurveTo(-0.6, 1, 0, 7);
  context.moveTo(0, -4);
  context.quadraticCurveTo(-2, -8, -3, -8);
  context.moveTo(0, -4);
  context.quadraticCurveTo(2, -8, 3, -8);
  context.stroke();
  context.restore();
}
