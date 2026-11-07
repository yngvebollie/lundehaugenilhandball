# Run with a Supabase management token in the process environment. Never print secrets or API responses.
param([switch]$ConfigureResend)
$ErrorActionPreference='Stop'
if(!$env:SUPABASE_ACCESS_TOKEN){throw 'Set SUPABASE_ACCESS_TOKEN privately before running.'}
$api='https://api.supabase.com/v1/projects/iqoqsaonxefyuwobuogo/config/auth'
$headers=@{Authorization="Bearer $env:SUPABASE_ACCESS_TOKEN"}
$current=Invoke-RestMethod -Uri $api -Headers $headers
$origin='https://app.lundehaugenil.no'
$urls=@($current.uri_allow_list -split ',' | Where-Object {$_})
foreach($path in '/apply**','/join**','/login**'){if($urls -notcontains "$origin$path"){$urls+="$origin$path"}}
$html=Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot '../supabase/templates/confirmation.html')
$settings=@{site_url=$origin;uri_allow_list=($urls -join ',');mailer_subjects_confirmation='Velkommen til Lundehaugen IL – bekreft e-posten din';mailer_templates_confirmation_content=$html}
if($ConfigureResend){
  if(!$env:RESEND_API_KEY){throw 'Verify the sender domain in Resend and set RESEND_API_KEY privately first.'}
  $settings+=@{smtp_host='smtp.resend.com';smtp_port='465';smtp_user='resend';smtp_pass=$env:RESEND_API_KEY;smtp_admin_email='noreply@lundehaugenil.no';smtp_sender_name='Lundehaugen IL'}
}
Invoke-RestMethod -Method Patch -Uri $api -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ($settings|ConvertTo-Json) | Out-Null
$after=Invoke-RestMethod -Uri $api -Headers $headers
if($after.mailer_templates_confirmation_content -ne $html){throw 'Template verification failed.'}
if($ConfigureResend -and $after.smtp_admin_email -ne 'noreply@lundehaugenil.no'){throw 'Sender verification failed.'}
Write-Output 'Confirmation template verified. SMTP changes applied only if ConfigureResend was specified.'
