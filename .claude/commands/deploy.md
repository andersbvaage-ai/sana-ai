Kjør deploy-sekvensen for Sana AI til produksjon (Elastic Beanstalk, eu-north-1).

## Steg 1 — CSP-sjekk
Grep alle filer i `public/` for inline event handlers: `onclick`, `onkeydown`, `onsubmit`, `onchange`, `oninput`, `onload`, `onblur`, `onfocus`.
Hvis noe finnes: stopp og fiks det først. Helmet CSP i produksjon blokkerer disse.

## Steg 2 — Finn neste versjonsnummer
List alle `deploy-v*.zip`-filer i prosjektmappen og finn høyeste versjonsnummer. Neste versjon er +1.
Presenter: "Neste versjon: vXX — fortsett?"

## Steg 3 — Docker build og push
Kjør i rekkefølge og stopp ved feil:
```bash
docker build --no-cache -t sana-ai .
docker tag sana-ai 480437358794.dkr.ecr.eu-north-1.amazonaws.com/sana-ai:latest
docker push 480437358794.dkr.ecr.eu-north-1.amazonaws.com/sana-ai:latest
```

## Steg 4 — Pakk og last opp til S3
```bash
powershell Compress-Archive -Path Dockerrun.aws.json -DestinationPath deploy-vXX.zip -Force
aws s3 cp deploy-vXX.zip s3://sana-ai-eb-deployments-480437358794/deploy-vXX.zip
```
(Erstatt XX med versjonsnummeret fra steg 2)

## Steg 5 — Deploy til Elastic Beanstalk
```bash
aws elasticbeanstalk create-application-version \
  --application-name sana-ai \
  --version-label vXX \
  --source-bundle S3Bucket=sana-ai-eb-deployments-480437358794,S3Key=deploy-vXX.zip

aws elasticbeanstalk update-environment \
  --environment-name sana-ai-prod \
  --version-label vXX
```

## Steg 6 — Verifiser
Vent 60 sekunder, sjekk deretter at miljøet er healthy:
```bash
aws elasticbeanstalk describe-environments \
  --environment-names sana-ai-prod \
  --query "Environments[0].{Status:Status,Health:Health,VersionLabel:VersionLabel}"
```
Forventet: `Status: Ready`, `Health: Green`.

Avslutt med: "Deploy vXX fullført. Produksjon: http://sana-ai.eu-north-1.elasticbeanstalk.com"
