Sjekk alle HTML-filer i `public/` for inline event handlers som vil bli blokkert av Helmet CSP i produksjon.

## Søk etter

Grep rekursivt i `public/` etter følgende mønstre:
- `onclick=`
- `onkeydown=`
- `onkeyup=`
- `onsubmit=`
- `onchange=`
- `oninput=`
- `onload=`
- `onblur=`
- `onfocus=`
- `onmouseover=`
- `onmouseout=`
- `onerror=`
- `javascript:` (i href-attributter)

## Rapporter

For hvert funn: vis filnavn, linjenummer og den aktuelle linjen.

Hvis ingen funn: "CSP-sjekk OK — ingen inline event handlers funnet."

Hvis funn: list dem gruppert per fil, og foreslå konkret addEventListener-erstatning for hvert tilfelle. Eksempel:

```html
<!-- Før (blokkeres av CSP) -->
<button onclick="sendForm()">Send</button>

<!-- Etter -->
<button id="send-btn">Send</button>
```
```js
// I tilhørende .js-fil
document.getElementById('send-btn').addEventListener('click', sendForm);
```

Avslutt med antall funn og anbefaling: fiks før deploy.
