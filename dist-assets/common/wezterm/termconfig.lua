local wezterm = require 'wezterm'

local config = {}

if wezterm.config_builder then
    config = wezterm.config_builder()
end

-- https://wezterm.org/colorschemes/
config.color_scheme = 'Argonaut'

-- шрифты можно локально положить в ./fonts
-- Lucida Console | JetBrains Mono | Consolas | Courier New | GeistMono NFM
local base_font = wezterm.font(
    'JetBrains Mono', { weight = 'Regular' } -- Light | Book | Regular | Medium | Bold
)

-- на грустном мониторе FullHD можно поиграть с настройками рендеринга шрифтов:
config.freetype_render_target = "Normal" -- Normal | HorizontalLcd
config.freetype_load_target = "Normal" -- Normal | Light | Mono | HorizontalLcd
config.freetype_load_flags = "DEFAULT" -- DEFAULT | NO_BITMAP | FORCE_AUTOHINT | NO_AUTOHINT

config.font_size = 13
config.font = base_font
config.font_dirs = { 'fonts' }

-- без жирных шрифтов
config.font_rules = { { intensity = 'Bold', font = base_font } }
config.bold_brightens_ansi_colors = true

config.initial_cols = 150
config.initial_rows = 38
config.window_decorations = 'TITLE | RESIZE'
config.window_background_opacity = 1.0
config.window_padding = { left = 6, right = 6, top = 4, bottom = 4 }

config.enable_tab_bar = false
config.scrollback_lines = 5000
config.exit_behavior = 'CloseOnCleanExit'
config.window_close_confirmation = 'NeverPrompt'

-- курсор - мигающий зелёный блок
config.default_cursor_style = 'BlinkingBlock'
config.colors = { cursor_bg = '#3da03d', cursor_border = '#3da03d' }

-- заголовок окна
wezterm.on('format-window-title', function()
    return 'Bylinter'
end)

return config
