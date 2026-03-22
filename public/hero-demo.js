(function () {
  const demo = document.getElementById('heroDemo');
  if (!demo) return;

  const sceneUpload    = document.getElementById('demoUpload');
  const sceneAnalyzing = document.getElementById('demoAnalyzing');
  const sceneResult    = document.getElementById('demoResult');

  function showScene(el) {
    [sceneUpload, sceneAnalyzing, sceneResult].forEach(s => s.classList.remove('active'));
    el.classList.add('active');
  }

  // ── Phase 1: Upload ──────────────────────────────────────────────────────
  function runUpload(onDone) {
    showScene(sceneUpload);

    const files = sceneUpload.querySelectorAll('.demo-file');
    const btn   = document.getElementById('demoAnalyseBtn');
    btn.classList.remove('pulse');

    files.forEach(f => { f.style.opacity = '0'; f.style.transform = 'translateX(14px)'; });

    files.forEach((f, i) => {
      setTimeout(() => {
        f.style.opacity = '1';
        f.style.transform = 'none';
      }, 400 + i * 280);
    });

    const afterFiles = 400 + files.length * 280 + 300;
    setTimeout(() => { btn.classList.add('pulse'); }, afterFiles);
    setTimeout(onDone, afterFiles + 500);
  }

  // ── Phase 2: Analyzing ───────────────────────────────────────────────────
  function runAnalyzing(onDone) {
    showScene(sceneAnalyzing);

    const fill  = document.getElementById('demoProg');
    const steps = sceneAnalyzing.querySelectorAll('.demo-step');

    fill.style.width = '0%';
    steps.forEach(s => { s.style.opacity = '0'; });

    setTimeout(() => { fill.style.width = '94%'; }, 80);
    steps.forEach((s, i) => {
      setTimeout(() => { s.style.opacity = '1'; }, 250 + i * 380);
    });

    setTimeout(onDone, 2400);
  }

  // ── Phase 3: Results ─────────────────────────────────────────────────────
  function runResult(onDone) {
    showScene(sceneResult);

    const items = sceneResult.querySelectorAll('.demo-fade');
    const bar   = document.getElementById('demoResultBar');

    bar.style.width = '0%';
    bar.style.transition = 'none';
    items.forEach(item => { item.style.opacity = '0'; item.style.transform = 'translateY(8px)'; });

    items.forEach((item, i) => {
      setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'none';
        if (item === items[items.length - 1]) {
          // Trigger bar fill after last item appears
          requestAnimationFrame(() => {
            bar.style.transition = 'width 1s ease';
            bar.style.width = '78%';
          });
        }
      }, 150 + i * 320);
    });

    setTimeout(onDone, 4500);
  }

  // ── Loop ─────────────────────────────────────────────────────────────────
  function loop() {
    runUpload(() => {
      runAnalyzing(() => {
        runResult(() => {
          setTimeout(loop, 700);
        });
      });
    });
  }

  loop();
})();
