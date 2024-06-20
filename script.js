function initializeBezierSpline(config) {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const contextMenu = document.getElementById("context-menu");
  const pointerToolButton = document.getElementById("pointer-tool");
  const penToolButton = document.getElementById("pen-tool");

  let controlPoints = [
    { x: 100, y: 500, type: "on", index: 0 },
    { x: 200, y: 100, type: "off", index: 1 },
    { x: 600, y: 100, type: "off", index: 2 },
    { x: 700, y: 500, type: "on", index: 3 },
  ];

  let state = {
    selectedPoint: null,
    draggingPoint: null,
    draggingCanvas: false,
    panOffset: { x: 0, y: 0 },
    lastMousePos: { x: 0, y: 0 },
    scale: 1,
    penToolActive: false,
  };

  resizeCanvas();
  initializeEventHandlers();
  setCustomCursors();

  function initializeEventHandlers() {
    window.addEventListener("resize", resizeCanvas);
    pointerToolButton.addEventListener("click", activatePointerTool);
    penToolButton.addEventListener("click", activatePenTool);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    contextMenu.addEventListener("click", handleContextMenuClick);
    document.addEventListener("keydown", handleKeyDown);
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
  }

  async function activatePointerTool() {
    state.penToolActive = false;
    pointerToolButton.classList.add("active");
    penToolButton.classList.remove("active");
    const cursorUrl = await getCursorUrl("pointer.svg", config.cursorSize);
    canvas.style.cursor = `url(${cursorUrl}) ${config.cursorSize / 2} ${
      config.cursorSize / 2
    }, auto`;
  }

  async function activatePenTool() {
    state.penToolActive = true;
    penToolButton.classList.add("active");
    pointerToolButton.classList.remove("active");
    const cursorUrl = await getCursorUrl("pen.svg", config.cursorSize);
    canvas.style.cursor = `url(${cursorUrl}) ${config.cursorSize / 2} ${
      config.cursorSize / 2
    }, auto`;
  }

  async function setCustomCursors() {
    const pointerCursorUrl = await getCursorUrl("pointer.svg", 24);
    const penCursorUrl = await getCursorUrl("pen.svg", 24);
  }

  function handleMouseDown(e) {
    const pos = getMousePos(e);
    if (e.button === 0) {
      handleLeftClick(pos, e);
    } else if (e.button === 2) {
      handleRightClick(pos, e);
    }
    draw();
  }

  function handleLeftClick(pos, e) {
    state.draggingPoint = findPoint(pos);
    if (state.penToolActive) {
      placeNewPoint(pos);
    } else if (state.draggingPoint) {
      state.selectedPoint = state.draggingPoint;
    } else {
      startCanvasDrag(pos);
      canvas.style.cursor = "grabbing";
    }
  }

  function handleRightClick(pos, e) {
    state.draggingPoint = findPoint(pos);
    if (state.draggingPoint) {
      showContextMenu(e, state.draggingPoint);
    }
  }

  function handleMouseMove(e) {
    const pos = getMousePos(e);
    if (state.draggingPoint) {
      movePoint(state.draggingPoint, pos);
    } else if (state.draggingCanvas) {
      panCanvas(pos);
    } else {
      updateCursor(pos);
    }
  }

  function handleMouseUp() {
    state.draggingPoint = null;
    state.draggingCanvas = false;
    if (!state.penToolActive) {
      activatePointerTool();
    }
  }

  function handleWheel(e) {
    zoomCanvas(e);
    canvas.style.cursor = "zoom-in";
    setTimeout(() => {
      updateCursor();
    }, 300);
    draw();
  }

  function handleContextMenuClick(e) {
    contextMenu.style.display = "none";
  }

  function handleKeyDown(e) {
    if (e.key === "Delete" && state.selectedPoint) {
      controlPoints = controlPoints.filter(
        (point) => point !== state.selectedPoint
      );
      state.selectedPoint = null;
      draw();
    }
  }

  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function findPoint(pos) {
    return controlPoints.find(
      (point) => distance(point, pos) < config.controlPoints.snapDistance
    );
  }

  function distance(point1, point2) {
    return Math.sqrt(
      Math.pow(point1.x * state.scale + state.panOffset.x - point2.x, 2) +
        Math.pow(point1.y * state.scale + state.panOffset.y - point2.y, 2)
    );
  }

  function draw() {
    clearCanvas();
    drawGrid();
    drawControlLines();
    drawControlPoints();
    drawLabels();
    drawBezierCurve();
  }

  function clearCanvas() {
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function placeNewPoint(pos) {
    const newOnCurvePoint = {
      x: (pos.x - state.panOffset.x) / state.scale,
      y: (pos.y - state.panOffset.y) / state.scale,
      type: "on",
    };
    const newOffCurvePoint1 = {
      x: newOnCurvePoint.x - 50,
      y: newOnCurvePoint.y - 50,
      type: "off",
    };
    const newOffCurvePoint2 = {
      x: newOnCurvePoint.x + 50,
      y: newOnCurvePoint.y + 50,
      type: "off",
    };
    controlPoints.push(newOffCurvePoint1, newOffCurvePoint2, newOnCurvePoint);
    draw();
  }

  function startCanvasDrag(pos) {
    state.selectedPoint = null;
    state.draggingCanvas = true;
    state.lastMousePos = pos;
  }

  function movePoint(point, pos) {
    point.x = (pos.x - state.panOffset.x) / state.scale;
    point.y = (pos.y - state.panOffset.y) / state.scale;
    draw();
  }

  function panCanvas(pos) {
    state.panOffset.x += pos.x - state.lastMousePos.x;
    state.panOffset.y += pos.y - state.lastMousePos.y;
    state.lastMousePos = pos;
    draw();
  }

  function zoomCanvas(e) {
    const pos = getMousePos(e);
    const zoom = e.deltaY < 0 ? config.zoomFactor : 1 / config.zoomFactor;
    const mouseX = (pos.x - state.panOffset.x) / state.scale;
    const mouseY = (pos.y - state.panOffset.y) / state.scale;

    state.scale *= zoom;
    state.panOffset.x = pos.x - mouseX * state.scale;
    state.panOffset.y = pos.y - mouseY * state.scale;
  }

  function drawControlLines() {
    ctx.beginPath();
    ctx.moveTo(
      controlPoints[0].x * state.scale + state.panOffset.x,
      controlPoints[0].y * state.scale + state.panOffset.y
    );
    for (let i = 1; i < controlPoints.length; i++) {
      ctx.lineTo(
        controlPoints[i].x * state.scale + state.panOffset.x,
        controlPoints[i].y * state.scale + state.panOffset.y
      );
    }
    ctx.strokeStyle = config.lines.controlLineColor;
    ctx.lineWidth = config.lines.controlLineWidth;
    ctx.stroke();
  }

  function drawControlPoints() {
    controlPoints.forEach((point) => {
      setControlPointStyle(point);
      ctx.beginPath();
      ctx.arc(
        point.x * state.scale + state.panOffset.x,
        point.y * state.scale + state.panOffset.y,
        config.controlPoints.radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
      if (point === state.selectedPoint) {
        ctx.stroke();
      }
    });
    resetShadowSettings();
  }

  function setControlPointStyle(point) {
    if (point === state.selectedPoint) {
      ctx.shadowColor = config.controlPoints.selectedHaloColor;
      ctx.shadowBlur = config.controlPoints.selectedHaloBlur;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle =
      point.type === "on"
        ? config.controlPoints.onCurveColor
        : config.controlPoints.offCurveColor;
    if (point === state.selectedPoint) {
      ctx.strokeStyle = config.controlPoints.selectedColor;
    }
  }

  function resetShadowSettings() {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }

  function drawLabels() {
    controlPoints.forEach((point) => {
      if (point.type === "on") {
        ctx.font = config.labels.font;
        ctx.fillStyle = config.labels.color;
        ctx.fillText(
          point.index,
          point.x * state.scale + state.panOffset.x + 10,
          point.y * state.scale + state.panOffset.y - 10
        );
      }
    });
  }

  function drawBezierCurve() {
    ctx.beginPath();
    ctx.moveTo(
      controlPoints[0].x * state.scale + state.panOffset.x,
      controlPoints[0].y * state.scale + state.panOffset.y
    );
    for (let i = 1; i < controlPoints.length - 2; i += 3) {
      ctx.bezierCurveTo(
        controlPoints[i].x * state.scale + state.panOffset.x,
        controlPoints[i].y * state.scale + state.panOffset.y,
        controlPoints[i + 1].x * state.scale + state.panOffset.x,
        controlPoints[i + 1].y * state.scale + state.panOffset.y,
        controlPoints[i + 2].x * state.scale + state.panOffset.x,
        controlPoints[i + 2].y * state.scale + state.panOffset.y
      );
    }
    ctx.strokeStyle = config.lines.bezierCurveColor;
    ctx.lineWidth = config.lines.bezierLineWidth;
    ctx.stroke();
  }

  function drawGrid() {
    const zoomLevel =
      Math.log(state.scale) / Math.log(config.grid.fineGridLinesPerCoarse);

    ctx.imageSmoothingEnabled = true;

    for (let i = 0; i < config.grid.numLevels; i++) {
      const level = Math.floor(zoomLevel) + i;
      const gridSize =
        config.grid.baseGridSize /
        Math.pow(config.grid.fineGridLinesPerCoarse, level);
      const factor = zoomLevel - level;

      let startFadeIn = -2;
      let startFadeOut = 0;
      let clampedFactor = Math.max(
        0,
        Math.min(1, (factor - startFadeIn) / (startFadeOut - startFadeIn))
      );

      const opacity = clampedFactor;

      const lineWidth =
        config.grid.coarseLineWidth *
        (config.grid.fineLineWidth +
          (1 - config.grid.fineLineWidth) * clampedFactor);

      ctx.strokeStyle = config.grid.color;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = opacity;

      for (
        let x = Math.floor(state.panOffset.x % (gridSize * state.scale)) + 0.5;
        x <= canvas.width;
        x += gridSize * state.scale
      ) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (
        let y = Math.floor(state.panOffset.y % (gridSize * state.scale)) + 0.5;
        y <= canvas.height;
        y += gridSize * state.scale
      ) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1.0;
  }

  function showContextMenu(e, point) {
    contextMenu.style.display = "block";
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;

    document.addEventListener(
      "click",
      () => {
        contextMenu.style.display = "none";
      },
      { once: true }
    );
  }

  async function updateCursor(pos) {
    const point = findPoint(pos || getMousePos({ clientX: 0, clientY: 0 }));
    if (point) {
      canvas.style.cursor = "pointer";
    } else if (state.penToolActive) {
      const cursorUrl = await getCursorUrl("pen.svg", config.cursorSize);
      canvas.style.cursor = `url(${cursorUrl}) ${config.cursorSize / 2} ${
        config.cursorSize / 2
      }, auto`;
    } else {
      const cursorUrl = await getCursorUrl("pointer.svg", config.cursorSize);
      canvas.style.cursor = `url(${cursorUrl}) ${config.cursorSize / 2} ${
        config.cursorSize / 2
      }, auto`;
    }
  }

  function getCursorUrl(url, size) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = url;
    });
  }

  draw();
}
