window.ADULTOS_CONFIG = {
  modulo: "peleas-pactadas",
  titulo: "Peleas Pactadas",
  subtitulo: "Registro exclusivo para adultos (18+)",
  poster: "../assets/img/afiche2.jpg",
  backend: {
    url: "https://script.google.com/macros/s/AKfycbzb7Y2gGQFVBv3jZWRFKD_fCIiraF3uBuZRk_Qfnk9C_RHHeJXR_ifHoXyFMkiIIfvAsg/exec",
    timeoutMs: 15000
  },
  precioFijo: 15000,
  reglas: {
    edadMinima: 18,
    edadMaxima: 99,
    requiereTutor: false,
    requiereLiberacion: true,
    requiereFirmaDibujada: true
  },
  liberacion: {
    archivo: "adultosLiberacion",
    requiereFirma: true,
    requiereFirmaDibujada: true
  },
  whatsapp: {
    mensajeIntro: "🥋 *Pelea Pactada - Guana-Cup 2027*\n\nHola, soy {nombre}.\nFolio: *{folio}*\n*Total a pagar: {simbolo}{monto}*\n\nQuisiera coordinar el pago por SINPE Móvil y los detalles del combate.\n\n📎 *Adjunto mi liberación de responsabilidad firmada (PDF).*"
  }
};
