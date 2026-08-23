const SIDEBAR_WIDTH = Number(process.env.SIDEBAR_WIDTH || 0);
const SIDEBAR_DIVIDER_WIDTH = 1;
const MIN_WIDTH_FOR_SIDEBAR = 110 + SIDEBAR_WIDTH + SIDEBAR_DIVIDER_WIDTH;
const SPLIT_DIVIDER_ROWS = 1;

export interface Layout {
  width: number;
  height: number;
  logHeight: number;
  statusRow: number;
  showSidebar: boolean;
  logWidth: number;
  sidebarWidth: number;
  dividerCol: number;
  sidebarCol: number;
  topHeight: number;
  bottomHeight: number;
}

export function getLayout(): Layout {
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;
  const showSidebar = SIDEBAR_WIDTH > 0 && width >= MIN_WIDTH_FOR_SIDEBAR;
  const logWidth = showSidebar
    ? width - SIDEBAR_WIDTH - SIDEBAR_DIVIDER_WIDTH
    : width;
  const dividerCol = logWidth + 1;
  const sidebarCol = dividerCol + SIDEBAR_DIVIDER_WIDTH;
  const logHeight = height - 1; // теперь только статус-бар забирает 1 строку

  const topHeight = Math.max(
    1,
    Math.floor((logHeight - SPLIT_DIVIDER_ROWS) / 1.5),
  );
  const bottomHeight = Math.max(1, logHeight - SPLIT_DIVIDER_ROWS - topHeight);

  return {
    width,
    height,
    logHeight,
    statusRow: height,
    showSidebar,
    logWidth,
    sidebarWidth: SIDEBAR_WIDTH,
    dividerCol,
    sidebarCol,
    topHeight,
    bottomHeight,
  };
}

// шаг прокрутки для PageUp/PageDown
export function getScrollStep(): number {
  const { topHeight } = getLayout();
  return Math.max(1, topHeight - 1); // 1 строка внахлёст
}
