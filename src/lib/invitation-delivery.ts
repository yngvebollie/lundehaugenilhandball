export type DeliveryStatus='pending'|'queued'|'sent'|'delivered'|'delivery_delayed'|'bounced'|'failed'|'suppressed'|'complained'|'canceled'|'unknown';
export type InvitationDelivery={id:string;recipient:string;member_role:'athlete'|'coach';sender:string;provider_id:string|null;status:DeliveryStatus;error_code:string|null;created_at:string;checked_at:string|null;check_error:string|null};
export const deliveryLabels:Record<DeliveryStatus,string>={pending:'Sender',queued:'I sendekø',sent:'Sendt – levering avventes',delivered:'Levert til e-postserver',delivery_delayed:'Forsinket',bounced:'Avvist av mottaker',failed:'Sending feilet',suppressed:'Blokkert mottaker',complained:'Merket som søppelpost',canceled:'Kansellert',unknown:'Levering ukjent'};
export function providerStatus(event:unknown):DeliveryStatus {
 if(event==='opened'||event==='clicked')return 'delivered';
 if(typeof event==='string'&&Object.hasOwn(deliveryLabels,event)&&event!=='pending')return event as DeliveryStatus;
 return 'unknown';
}
export function providerFailure(status:number,name:unknown){
 if(status===401||name==='invalid_api_key')return 'provider_auth';
 if(status===403)return 'provider_permission';
 if(status===429)return 'provider_limit';
 if(status===422||status===400)return 'provider_validation';
 return 'provider_unavailable';
}
export function deliveryProblem(code:string|null):string {
 const messages:Record<string,string>={
  provider_auth:'E-posttjenesten avviste API-nøkkelen. Administrator må kontrollere Resend-oppsettet.',
  provider_permission:'Resend avviste tilgangen. Administrator må kontrollere nøkkel, avsenderdomene og senderrettigheter.',
  provider_limit:'Resend har nådd en sende- eller forespørselsgrense. Kontroller kvote og prøv igjen senere.',
  provider_validation:'Resend avviste e-postdataene. Kontroller mottakeradresse og verifisert avsenderdomene.',
  provider_unavailable:'E-posttjenesten svarte med en feil. Kontroller Resend-loggen før ny sending.',
  timeout:'Sendingen fikk ingen sikker kvittering. Den kan ha blitt sendt. Kontroller Resend før du sender på nytt.',
  missing_receipt:'E-posttjenesten returnerte ikke en gyldig meldings-ID. Levering kan ikke spores.',
  read_permission:'Leveringsstatus kan ikke hentes. Administrator må gi serveren en Resend-nøkkel med Full access i RESEND_READ_API_KEY.',
  lookup_failed:'Siste statuskontroll feilet. Lagret status er beholdt. Prøv Oppdater status igjen.',
  missing_configuration:'Leveringskontroll er ikke konfigurert på serveren.',
  receipt_mismatch:'Kvitteringen samsvarer ikke med mottakeren eller avsenderen. Levering er ikke bekreftet.',
 };
 return code?messages[code]||'Leveringsstatus kan ikke bekreftes. Kontroller e-postloggen.':'';
}
export function deliveryDetail(row:InvitationDelivery){
 if(row.error_code)return deliveryProblem(row.error_code);
 const detail:Partial<Record<DeliveryStatus,string>>={
  pending:'Utsendingen er startet, men det finnes ennå ingen kvittering. Ikke send på nytt før status er avklart.',
  queued:'Resend har satt meldingen i kø. Levering er ennå ikke bekreftet.',
  sent:'Meldingen er sendt fra Resend, men mottakerens server har ennå ikke bekreftet levering.',
  delivered:'Mottakerens e-postserver har tatt imot meldingen. Det betyr ikke at den er lest eller ligger i innboksen. Sjekk også søppelpost.',
  delivery_delayed:'Midlertidig leveringsproblem hos mottakeren. Resend forsøker igjen automatisk. Ikke send en ny kopi ennå.',
  bounced:'Mottakerens e-postserver avviste meldingen. Kontroller adressen og mottakerens e-postoppsett før ny invitasjon.',
  failed:'Resend kunne ikke sende meldingen. Administrator må kontrollere meldingen i Resend-loggen.',
  suppressed:'Resend har blokkert sending til denne adressen, for eksempel etter tidligere avvisning. Kontroller mottakeren i Resend.',
  complained:'Meldingen er rapportert som søppelpost. Avklar med mottakeren før du sender flere invitasjoner.',
  canceled:'Denne utsendingen er kansellert.',
  unknown:'Vi har ingen bekreftet leveringsstatus. Dette er ikke en bekreftelse på at e-posten kom frem.',
 };
 return detail[row.status]||detail.unknown!;
}
