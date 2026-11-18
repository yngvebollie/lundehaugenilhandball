from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'output/pdf/milepaeler-18-11-2026.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
NAVY, PINK, MUTED = colors.HexColor('#111c38'), colors.HexColor('#d00059'), colors.HexColor('#526078')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleLocal',fontName='Helvetica-Bold',fontSize=26,leading=31,textColor=NAVY,spaceAfter=8))
styles.add(ParagraphStyle(name='BodyLocal',fontName='Helvetica',fontSize=10,leading=15,textColor=NAVY,spaceAfter=7))
styles.add(ParagraphStyle(name='SectionLocal',fontName='Helvetica-Bold',fontSize=13,leading=18,textColor=NAVY,spaceBefore=13,spaceAfter=7))
styles.add(ParagraphStyle(name='SmallLocal',fontName='Helvetica',fontSize=9,leading=13,textColor=MUTED,spaceAfter=6))
styles.add(ParagraphStyle(name='LabelLocal',fontName='Helvetica-Bold',fontSize=10,leading=15,textColor=PINK))

def para(text, style='BodyLocal'):
    return Paragraph(text, styles[style])

def frame(c, doc):
    w,h=A4
    c.setFillColor(NAVY);c.rect(0,h-77,w,77,fill=1,stroke=0)
    c.drawImage(str(ROOT/'public/club-crest.webp'),40,h-62,width=40,height=40,mask='auto')
    c.setFillColor(colors.white);c.setFont('Helvetica-Bold',13);c.drawString(94,h-37,'LUNDEHAUGEN IL')
    c.setFont('Helvetica',9);c.drawString(94,h-54,'Performance Platform | Status 18. november 2026')
    c.setFillColor(PINK);c.rect(0,h-80,w,3,fill=1,stroke=0)
    c.setStrokeColor(colors.HexColor('#d9dde6'));c.line(40,42,w-40,42)
    c.setFillColor(MUTED);c.setFont('Helvetica',8)
    c.drawString(40,28,'app.lundehaugenil.no | Utskriftsoversikt over neste milepaeler')
    c.drawRightString(w-40,28,str(doc.page))

story=[para('Neste milepæler','TitleLocal'),para('Hva er levert, hva gjenstår, og hva tar vi videre?','SmallLocal')]
story += [para('Levert i denne runden','SectionLocal'),para('Mobilstabilitet: trenernotat og utøverens sett beholdes ved midlertidig feil i bakgrunnshenting. Tydelig tilkoblingsstatus, ny henting etter pause og vern ved tilgangsfeil. Dagens rosa stil beholdes.'),para('Testet med begge roller i nettleser og isolerte data. Dette er ikke en fysisk telefontest. Utkast er ikke garantert etter at siden lukkes eller lastes helt på nytt.','SmallLocal')]
story.append(para('Gjenstående milepæler, i prioritert rekkefølge','SectionLocal'))
rows=[
 ('M1','Fysisk mobiltest','Gjenstår','iPhone og Android: hjemskjermikon, innlogging, video, tilbakeknapp, pause og nettbrudd. Begge roller må bestå. Krever tilgang til telefonene.'),
 ('M2','Ekte e-postinvitasjon','Neste integrasjonstest','Eget testalias på yngve@bluemint.no. Bekreft faktisk levering fra noreply@lundehaugenil.no, mobil lenke, innmelding og riktig lag. Krever sending og innboks/leveringslogg.'),
 ('M3','Sikkerhetsherding','Gjenstår','Gjennomgå kampredigeringens databasefunksjon og beskyttelse mot lekkede passord. Trenerflyten skal fungere; utøvere og andre lag skal ikke få urettmessig tilgang.'),
 ('M4','Avstemming av eldre ønsker','Gjenstår','Kontroller registrering, spillerkoblinger, sesong, statistikk, merker/stemmer, filmer, belastning, meldinger og adminvisning. Lag en restliste med bestått, mangler og ikke testet.'),
]
for code,title,status,body in rows:
    content=[para(title+' <font color="#526078">| '+status+'</font>'),para(body,'SmallLocal')]
    t=Table([[para(code,'LabelLocal'),content]],colWidths=[35,480],hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,-1),.5,colors.HexColor('#d9dde6'))]))
    story.append(KeepTogether(t))
story += [Spacer(1,10),para('Allerede levert i de siste milepælene','SectionLocal'),para('Samlet kalender og hjemskjermoppsett; planlegg/publiser/registrer/følg opp; felles aktivitetshistorikk; oppfølgingsforslag; fulgt opp med trenernotat; gjenåpning med bevart historikk.','SmallLocal'),para('Avgrensning: Oversikten er ikke en bekreftelse på at alle historiske ønsker i chatten er ferdige. M4 skal avklare dette. Ekte e-postlevering og fysisk mobiltest er ikke gjentatt i denne leveransen.','SmallLocal')]
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=40,leftMargin=40,topMargin=101,bottomMargin=55,title='Lundehaugen IL - Gjenstaende milepaeler',author='Lundehaugen IL')
doc.build(story,onFirstPage=frame,onLaterPages=frame)
print(OUT)
