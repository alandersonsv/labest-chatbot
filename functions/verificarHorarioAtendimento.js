// functions/verificarHorarioAtendimento.js

const feriadosNacionais = [
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-04-03",
  "2026-04-21",
  "2026-05-01",
  "2026-06-04",
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-15",
  "2026-11-20",
  "2026-12-25",
];

function getBrazilDate() {
  const now = new Date();
  // Ajusta UTC → Brasil (UTC-3)
  now.setHours(now.getHours() - 3);
  return now;
}

function isWithinBusinessHours(date) {
  const day = date.getDay(); // 0 = domingo
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (day === 0 || day === 6) return false;

  const opening = 8 * 60;
  const closing = 17 * 60;

  return minutes >= opening && minutes <= closing;
}

function isHoliday(date) {
  const dateString = date.toISOString().split("T")[0];
  return feriadosNacionais.includes(dateString);
}

export async function verificarHorarioAtendimento() {
  const now = getBrazilDate();

  const isBusinessHours =
    isWithinBusinessHours(now) && !isHoliday(now);

  return {
    success: true,
    isBusinessHours,
  };
}
