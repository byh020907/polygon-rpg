function rectangle(x, y, width, height) {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

function octagon(cx, cy, radiusX, radiusY) {
  return Array.from({ length: 8 }, (_, index) => {
    const angle = Math.PI / 8 + (index * Math.PI) / 4;
    return { x: cx + Math.cos(angle) * radiusX, y: cy + Math.sin(angle) * radiusY };
  });
}

function item(id, points, fill, options = {}) {
  return Object.freeze({
    id,
    points: Object.freeze(points.map((point) => Object.freeze(point))),
    fill,
    stroke: options.stroke ?? '#10151a',
    lineWidth: options.lineWidth ?? 1,
    opacity: options.opacity ?? 1,
    order: options.order ?? 0,
    renderOrder: options.renderOrder ?? 30,
    presentationOnly: true,
  });
}

function slantedBar(x, y, length, thickness, rise = 0) {
  return [
    { x, y },
    { x: x + length, y: y - rise },
    { x: x + length, y: y - rise + thickness },
    { x, y: y + thickness },
  ];
}

function headgearItems(profile, view, centerX, headY, headRadius, lean, order) {
  const id = `${profile.id}-${view}-headgear`;
  const cx = centerX + lean;
  const top = headY - headRadius;
  const narrow = view === 'side';
  const width = narrow ? headRadius : headRadius * 1.65;
  const left = cx - width / 2;
  const accent = profile.accent;
  if (profile.family === 'machine') {
    return [
      item(`${id}-signal`, octagon(cx, headY, Math.max(2.5, headRadius * 0.35), 2.5), accent, {
        stroke: accent,
        order,
      }),
    ];
  }
  if (profile.id === 'scrapyard-apprentice') {
    return [
      item(`${id}-strap`, rectangle(left, headY - 2, width, 2), '#29343b', { order }),
      item(`${id}-goggle-left`, rectangle(cx - 5, headY - 3, 4, 4), accent, { order: order + 1 }),
      item(`${id}-goggle-right`, rectangle(cx + 1, headY - 3, 4, 4), accent, {
        order: order + 1,
      }),
    ];
  }
  if (profile.id === 'scrapyard-owner') {
    return [
      item(`${id}-welding-goggles`, rectangle(left - 1, top + 2, width + 2, 5), accent, { order }),
      item(`${id}-side-lens`, rectangle(cx + width / 2 - 1, top + 4, 3, 5), '#292d31', {
        order: order + 1,
      }),
    ];
  }
  if (profile.id === 'mine-worker') {
    return [
      item(`${id}-helmet`, rectangle(left - 2, top + 2, width + 4, 5), accent, { order }),
      item(`${id}-lamp`, octagon(cx, top, 3, 3), '#f4e4a0', { order: order + 1 }),
    ];
  }
  if (profile.id === 'shipyard-worker') {
    return [
      item(
        `${id}-visor`,
        [
          { x: left - 1, y: top + 1 },
          { x: left + width + 1, y: top + 1 },
          { x: left + width - 1, y: headY + 5 },
          { x: left + 1, y: headY + 5 },
        ],
        '#26363d',
        { stroke: accent, order },
      ),
    ];
  }
  if (profile.id === 'greenhouse-technician') {
    return [
      item(`${id}-visor`, slantedBar(left, headY - 3, width, 3, narrow ? 1 : 0), accent, {
        order,
      }),
    ];
  }
  if (profile.id === 'snow-train-crew') {
    return [
      item(`${id}-hat`, rectangle(left - 2, top - 1, width + 4, 6), accent, { order }),
      item(`${id}-earflap`, rectangle(cx + width / 2 - 2, top + 4, 4, 10), accent, {
        order: order + 1,
      }),
    ];
  }
  if (profile.id === 'quarry-worker') {
    return [
      item(`${id}-hard-hat`, rectangle(left - 2, top, width + 4, 5), '#8a4935', { order }),
      item(`${id}-earmuff`, rectangle(cx + width / 2 - 2, top + 4, 5, 9), accent, {
        order: order + 1,
      }),
      item(
        `${id}-dust-mask`,
        [
          { x: cx - width / 2, y: headY - 1 },
          { x: cx + width / 2, y: headY - 1 },
          { x: cx + 3, y: headY + 6 },
          { x: cx - 3, y: headY + 6 },
        ],
        '#c6b8a0',
        { stroke: accent, order: order + 2 },
      ),
    ];
  }
  return [
    item(
      `${id}-face-guard`,
      [
        { x: left - 1, y: top + 2 },
        { x: left + width + 1, y: top + 2 },
        { x: left + width - 2, y: headY + 6 },
        { x: cx, y: headY + headRadius },
        { x: left + 2, y: headY + 6 },
      ],
      accent,
      { order },
    ),
  ];
}

function outfitLandmarkItems(profile, view, centerX, neckY, hipY, shoulder, order) {
  const narrow = view === 'side';
  const width = narrow ? Math.max(4, shoulder * 0.55) : shoulder;
  if (profile.id === 'scrapyard-apprentice') {
    return [
      item(
        `${profile.id}-${view}-repair-wrap`,
        rectangle(centerX - width / 2 - 1, neckY + 13, 5, 4),
        profile.accent,
        { order },
      ),
    ];
  }
  if (profile.id === 'shipyard-worker') {
    return [
      item(
        `${profile.id}-${view}-heat-apron`,
        [
          { x: centerX - width / 2 + 2, y: neckY + 9 },
          { x: centerX + width / 2 - 2, y: neckY + 9 },
          { x: centerX + width / 2, y: hipY + 4 },
          { x: centerX - width / 2, y: hipY + 4 },
        ],
        '#26363d',
        { stroke: profile.accent, order },
      ),
    ];
  }
  if (profile.id === 'snow-train-crew') {
    return [
      item(
        `${profile.id}-${view}-coat-collar`,
        [
          { x: centerX - width / 2, y: neckY + 4 },
          { x: centerX, y: neckY + 11 },
          { x: centerX + width / 2, y: neckY + 4 },
          { x: centerX, y: neckY + 7 },
        ],
        profile.accent,
        { order },
      ),
    ];
  }
  if (profile.id === 'quarry-worker') {
    return [
      item(
        `${profile.id}-${view}-dust-jacket-yoke`,
        slantedBar(centerX - width / 2 - 2, neckY + 4, width + 4, 5, 0),
        profile.accent,
        { order },
      ),
      item(
        `${profile.id}-${view}-respirator-harness`,
        [
          { x: centerX - width / 2 + 1, y: neckY + 8 },
          { x: centerX - width / 2 + 4, y: neckY + 8 },
          { x: centerX + width / 2 - 1, y: hipY + 2 },
          { x: centerX + width / 2 - 4, y: hipY + 2 },
        ],
        '#d8b27c',
        { order: order + 1 },
      ),
    ];
  }
  return [];
}

function toolItems(profile, view, toolBaseX, toolBaseY, action, order) {
  const id = `${profile.id}-${view}-tool-${profile.toolKind}`;
  const accent = profile.accent;
  const rise = action ? 9 : -11;
  if (profile.toolKind === 'tool-bag') {
    return [
      item(`${id}-strap`, slantedBar(toolBaseX - 5, toolBaseY - 9, 11, 2, -10), '#2b3439', {
        order,
      }),
      item(
        id,
        [
          { x: toolBaseX - 2, y: toolBaseY },
          { x: toolBaseX + 8, y: toolBaseY },
          { x: toolBaseX + 10, y: toolBaseY + 11 },
          { x: toolBaseX - 4, y: toolBaseY + 11 },
        ],
        accent,
        { order: order + 1 },
      ),
    ];
  }
  if (profile.toolKind === 'ledger-wrench') {
    return [
      item(`${id}-ledger`, rectangle(toolBaseX - 4, toolBaseY - 2, 9, 11), '#c7ad72', { order }),
      item(id, slantedBar(toolBaseX + 3, toolBaseY + 7, 18, 3, rise), accent, {
        order: order + 1,
      }),
      item(
        `${id}-jaw`,
        [
          { x: toolBaseX + 18, y: toolBaseY + 7 - rise },
          { x: toolBaseX + 24, y: toolBaseY + 3 - rise },
          { x: toolBaseX + 22, y: toolBaseY + 10 - rise },
        ],
        accent,
        { order: order + 2 },
      ),
    ];
  }
  if (profile.toolKind === 'pickaxe') {
    return [
      item(`${id}-handle`, slantedBar(toolBaseX, toolBaseY + 10, 22, 3, rise), '#7b5538', {
        order,
      }),
      item(
        id,
        [
          { x: toolBaseX + 14, y: toolBaseY + 2 - rise },
          { x: toolBaseX + 28, y: toolBaseY - 1 - rise },
          { x: toolBaseX + 22, y: toolBaseY + 5 - rise },
          { x: toolBaseX + 10, y: toolBaseY + 8 - rise },
        ],
        accent,
        { order: order + 1 },
      ),
    ];
  }
  if (profile.toolKind === 'rivet-gun') {
    return [
      item(
        id,
        [
          { x: toolBaseX, y: toolBaseY },
          { x: toolBaseX + 18, y: toolBaseY - (action ? 6 : 1) },
          { x: toolBaseX + 20, y: toolBaseY + 4 },
          { x: toolBaseX + 8, y: toolBaseY + 7 },
          { x: toolBaseX + 5, y: toolBaseY + 15 },
          { x: toolBaseX + 1, y: toolBaseY + 14 },
        ],
        accent,
        { order },
      ),
      item(
        `${id}-nozzle`,
        slantedBar(toolBaseX + 18, toolBaseY + 1, 8, 2, action ? 3 : 0),
        '#c6d4d8',
        {
          order: order + 1,
        },
      ),
    ];
  }
  if (profile.toolKind === 'sensor-wand') {
    return [
      item(id, slantedBar(toolBaseX, toolBaseY + 10, 24, 2, rise), accent, { order }),
      item(
        `${id}-sensor`,
        [
          { x: toolBaseX + 21, y: toolBaseY + 7 - rise },
          { x: toolBaseX + 27, y: toolBaseY + 3 - rise },
          { x: toolBaseX + 31, y: toolBaseY + 8 - rise },
          { x: toolBaseX + 26, y: toolBaseY + 13 - rise },
        ],
        '#b9f1ce',
        { order: order + 1 },
      ),
    ];
  }
  if (profile.toolKind === 'signal-lamp') {
    return [
      item(`${id}-handle`, slantedBar(toolBaseX, toolBaseY - 5, 10, 2, action ? 8 : 0), accent, {
        order,
      }),
      item(id, rectangle(toolBaseX + (action ? 8 : 0), toolBaseY, 10, 13), '#d8eef2', {
        stroke: accent,
        order: order + 1,
      }),
    ];
  }
  if (profile.toolKind === 'quarry-drill') {
    return [
      item(
        `${id}-rear-grip`,
        slantedBar(toolBaseX - 5, toolBaseY + 4, 18, 5, action ? 5 : -1),
        accent,
        { order },
      ),
      item(
        id,
        [
          { x: toolBaseX + 7, y: toolBaseY + (action ? -3 : 6) },
          { x: toolBaseX + 18, y: toolBaseY + (action ? -2 : 7) },
          { x: toolBaseX + 23, y: toolBaseY + (action ? 9 : 20) },
          { x: toolBaseX + 13, y: toolBaseY + (action ? 12 : 23) },
        ],
        '#3a3f40',
        { stroke: accent, order: order + 1 },
      ),
      item(
        `${id}-bit`,
        [
          { x: toolBaseX + 16, y: toolBaseY + (action ? 9 : 20) },
          { x: toolBaseX + 21, y: toolBaseY + (action ? 9 : 20) },
          { x: toolBaseX + 22, y: toolBaseY + (action ? 31 : 38) },
          { x: toolBaseX + 18, y: toolBaseY + (action ? 38 : 45) },
          { x: toolBaseX + 15, y: toolBaseY + (action ? 31 : 38) },
        ],
        '#c6c1b2',
        { stroke: '#332b27', order: order + 2 },
      ),
    ];
  }
  if (profile.toolKind === 'magnet-claw') {
    return [
      item(`${id}-arm`, slantedBar(toolBaseX - 3, toolBaseY + 8, 22, 5, action ? 8 : 0), accent, {
        order,
      }),
      item(
        id,
        [
          { x: toolBaseX + 16, y: toolBaseY + 5 - (action ? 8 : 0) },
          { x: toolBaseX + 28, y: toolBaseY - 2 - (action ? 8 : 0) },
          { x: toolBaseX + 24, y: toolBaseY + 6 - (action ? 8 : 0) },
          { x: toolBaseX + 30, y: toolBaseY + 13 - (action ? 8 : 0) },
        ],
        accent,
        { order: order + 1 },
      ),
    ];
  }
  if (profile.toolKind === 'drill-maw') {
    return [
      item(
        id,
        [
          { x: toolBaseX - 3, y: toolBaseY + 2 },
          { x: toolBaseX + 27, y: toolBaseY - (action ? 7 : 1) },
          { x: toolBaseX + 9, y: toolBaseY + 12 },
        ],
        accent,
        { order },
      ),
    ];
  }
  if (profile.toolKind === 'hydraulic-crane') {
    return [
      item(
        id,
        [
          { x: toolBaseX - 4, y: toolBaseY + 10 },
          { x: toolBaseX + 23, y: toolBaseY - (action ? 10 : 3) },
          { x: toolBaseX + 29, y: toolBaseY - (action ? 5 : 0) },
          { x: toolBaseX + 2, y: toolBaseY + 16 },
        ],
        accent,
        { order },
      ),
      item(
        `${id}-second-boom`,
        slantedBar(toolBaseX - 8, toolBaseY + 5, 25, 5, action ? -8 : -2),
        profile.material,
        { stroke: accent, order: order - 1 },
      ),
      item(
        `${id}-cross-cable`,
        slantedBar(toolBaseX - 3, toolBaseY - 1, 27, 2, action ? 1 : -5),
        '#1b292c',
        { stroke: accent, order: order + 1 },
      ),
    ];
  }
  if (profile.toolKind === 'geothermal-manifold') {
    return [
      item(
        id,
        [
          { x: toolBaseX - 8, y: toolBaseY + 4 },
          { x: toolBaseX + 10, y: toolBaseY - (action ? 9 : 2) },
          { x: toolBaseX + 30, y: toolBaseY + 2 },
          { x: toolBaseX + 28, y: toolBaseY + 10 },
          { x: toolBaseX + 7, y: toolBaseY + 7 },
          { x: toolBaseX - 5, y: toolBaseY + 14 },
        ],
        profile.material,
        { stroke: accent, order },
      ),
      item(
        `${id}-pressure-valve`,
        octagon(toolBaseX + 10, toolBaseY - (action ? 10 : 2), 7, 7),
        accent,
        { stroke: '#efffcf', order: order + 1 },
      ),
      item(
        `${id}-steam-stack`,
        slantedBar(toolBaseX - 7, toolBaseY + 2, 24, 5, action ? 12 : 4),
        '#b6caa3',
        { stroke: accent, order: order - 1 },
      ),
    ];
  }
  if (profile.toolKind === 'snowplow-train') {
    return [
      item(
        id,
        [
          { x: toolBaseX - 9, y: toolBaseY + 2 },
          { x: toolBaseX + 16, y: toolBaseY - (action ? 12 : 4) },
          { x: toolBaseX + 32, y: toolBaseY - (action ? 18 : 9) },
          { x: toolBaseX + 35, y: toolBaseY + 16 },
          { x: toolBaseX + 15, y: toolBaseY + 10 },
          { x: toolBaseX - 8, y: toolBaseY + 13 },
        ],
        profile.material,
        { stroke: accent, order },
      ),
      item(`${id}-track`, rectangle(toolBaseX - 13, toolBaseY + 14, 42, 8), '#33454f', {
        stroke: accent,
        order: order - 1,
      }),
      item(
        `${id}-heater-rivet`,
        octagon(toolBaseX + 8, toolBaseY - (action ? 10 : 2), 7, 7),
        accent,
        { stroke: '#f4fbff', order: order + 1 },
      ),
    ];
  }
  if (profile.toolKind === 'rock-cutting-machine') {
    return [
      item(
        id,
        [
          { x: toolBaseX - 10, y: toolBaseY + 4 },
          { x: toolBaseX + 14, y: toolBaseY - (action ? 12 : 5) },
          { x: toolBaseX + 34, y: toolBaseY - (action ? 8 : 1) },
          { x: toolBaseX + 35, y: toolBaseY + 17 },
          { x: toolBaseX + 10, y: toolBaseY + 13 },
          { x: toolBaseX - 9, y: toolBaseY + 16 },
        ],
        profile.material,
        { stroke: accent, order },
      ),
      item(
        `${id}-cutting-blade`,
        octagon(toolBaseX + 34, toolBaseY - (action ? 7 : 0), 15, 22),
        '#b8aea0',
        { stroke: accent, lineWidth: 2, order: order + 1 },
      ),
      item(
        `${id}-blade-hub`,
        octagon(toolBaseX + 34, toolBaseY - (action ? 7 : 0), 6, 7),
        '#d9b36c',
        { stroke: '#4b2a22', order: order + 2 },
      ),
      item(
        `${id}-outrigger`,
        slantedBar(toolBaseX - 12, toolBaseY + 16, 42, 7, action ? -4 : 0),
        '#4b3630',
        { stroke: accent, order: order - 1 },
      ),
    ];
  }
  return [
    item(
      id,
      [
        { x: toolBaseX - 3, y: toolBaseY + 2 },
        { x: toolBaseX + 25, y: toolBaseY - (action ? 9 : 2) },
        { x: toolBaseX + 29, y: toolBaseY + 8 - (action ? 9 : 2) },
        { x: toolBaseX, y: toolBaseY + 15 },
      ],
      accent,
      { order },
    ),
  ];
}

function silhouetteItems(profile, view, centerX, floorY, order) {
  const height = profile.minimumViewportHeight;
  const headRadius = profile.proportions.head;
  const shoulder = view === 'side' ? profile.proportions.sideDepth : profile.proportions.shoulder;
  const hip = view === 'side' ? profile.proportions.sideDepth * 0.72 : profile.proportions.hip;
  const action = view === 'representative-pose';
  const crouch = action && profile.family === 'machine' ? 8 : action ? 4 : 0;
  const lean = action ? 4 : 0;
  const headY = floorY - height + headRadius + crouch;
  const neckY = headY + headRadius - 1;
  const hipY = floorY - 25 + crouch;
  const torso = [
    { x: centerX - shoulder / 2 + lean, y: neckY + 5 },
    { x: centerX + shoulder / 2 + lean, y: neckY + 5 },
    { x: centerX + hip / 2, y: hipY },
    { x: centerX - hip / 2, y: hipY },
  ];
  const result = [
    item(`${profile.id}-${view}-torso`, torso, profile.material, { order }),
    item(
      `${profile.id}-${view}-head`,
      octagon(centerX + lean, headY, headRadius, headRadius),
      profile.family === 'machine' ? profile.material : '#d9ae86',
      { order: order + 1 },
    ),
  ];

  if (profile.family === 'machine' && profile.id === 'industrial-creature') {
    result.push(
      item(
        `${profile.id}-${view}-body-plate`,
        rectangle(centerX - shoulder / 2 - 3, neckY + 11, shoulder + 6, 18),
        profile.material,
        { order: order + 1 },
      ),
    );
  }

  const legSpread = action ? 8 : 5;
  result.push(
    item(
      `${profile.id}-${view}-leg-left`,
      [
        { x: centerX - 5, y: hipY - 1 },
        { x: centerX - 1, y: hipY },
        { x: centerX - legSpread + 2, y: floorY },
        { x: centerX - legSpread - 3, y: floorY },
      ],
      '#252d33',
      { order },
    ),
    item(
      `${profile.id}-${view}-leg-right`,
      [
        { x: centerX + 1, y: hipY },
        { x: centerX + 5, y: hipY - 1 },
        { x: centerX + legSpread + 3, y: floorY },
        { x: centerX + legSpread - 2, y: floorY },
      ],
      '#252d33',
      { order },
    ),
  );

  const armY = neckY + 9;
  const handY = action ? armY + 12 : hipY - 2;
  result.push(
    item(
      `${profile.id}-${view}-arm-left`,
      [
        { x: centerX - shoulder / 2, y: armY },
        { x: centerX - shoulder / 2 + 4, y: armY + 1 },
        { x: centerX - 7, y: handY },
        { x: centerX - 11, y: handY - 1 },
      ],
      profile.material,
      { order: order + 1 },
    ),
    item(
      `${profile.id}-${view}-arm-right`,
      [
        { x: centerX + shoulder / 2 - 4, y: armY + 1 },
        { x: centerX + shoulder / 2, y: armY },
        { x: centerX + (action ? 18 : 10), y: handY - (action ? 5 : 0) },
        { x: centerX + (action ? 14 : 6), y: handY + 2 },
      ],
      profile.material,
      { order: order + 1 },
    ),
  );

  result.push(
    ...headgearItems(profile, view, centerX, headY, headRadius, lean, order + 3),
    ...outfitLandmarkItems(profile, view, centerX, neckY, hipY, shoulder, order + 2),
  );

  const toolBaseX = centerX + (action ? 13 : 8);
  const toolBaseY = action ? handY - 7 : hipY - 6;
  result.push(...toolItems(profile, view, toolBaseX, toolBaseY, action, order + 2));
  return result;
}

export function createCharacterDesignBoard(profileCatalog) {
  const profiles = profileCatalog.profiles;
  const cellWidth = 920 / profiles.length;
  const startX = 20;
  const floorY = 424;
  const items = [
    item('character-board-backdrop', rectangle(0, 0, 960, 540), '#111820', {
      stroke: '#111820',
      order: -100,
      renderOrder: 1,
    }),
    item('character-board-scale-line', rectangle(18, floorY + 2, 924, 2), '#798693', {
      stroke: '#798693',
      order: -10,
    }),
  ];
  profiles.forEach((profile, profileIndex) => {
    const cellX = startX + profileIndex * cellWidth;
    items.push(
      item(
        `character-board-cell-${profile.id}`,
        rectangle(cellX, 318, cellWidth - 6, 116),
        profileIndex % 2 === 0 ? '#18232d' : '#1c2730',
        { stroke: profile.accent, opacity: 0.96, order: -5 },
      ),
      item(
        `character-board-material-${profile.id}`,
        rectangle(cellX + 5, 325, cellWidth - 16, 4),
        profile.accent,
        { stroke: profile.accent, order: -4 },
      ),
    );
    const centers = [cellX + cellWidth * 0.18, cellX + cellWidth * 0.48, cellX + cellWidth * 0.78];
    for (const [viewIndex, view] of profileCatalog.comparisonViews.entries()) {
      items.push(...silhouetteItems(profile, view, centers[viewIndex], floorY, profileIndex * 20));
    }
  });
  return Object.freeze({
    items: Object.freeze(items),
    manifest: Object.freeze({
      title: '고철 생활권 캐릭터 실루엣 비교',
      scaleLabel: profileCatalog.actualGameplayScaleLabel,
      views: profileCatalog.comparisonViews,
      entries: Object.freeze(
        profiles.map((profile) =>
          Object.freeze({
            id: profile.id,
            label: profile.label,
            roleLabel: profile.roleLabel,
            accent: profile.accent,
            landmarks: profile.landmarks,
            representativePose: profile.representativePose,
          }),
        ),
      ),
    }),
  });
}
