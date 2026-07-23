local wezterm = require 'wezterm'

local config = {}

if wezterm.config_builder then
    config = wezterm.config_builder()
end

-- https://wezterm.org/colorschemes/
config.color_scheme = 'Argonaut'

-- список шрифтов, будем искать по порядку
local base_font = wezterm.font_with_fallback({
    'FantasqueSansM Nerd Font Mono',
    'Consolas',
})

config.font_size = 12.0
config.font = base_font
config.font_dirs = { 'fonts' }

-- без жирных шрифтов
config.font_rules = { { intensity = 'Bold', font = base_font } }
config.bold_brightens_ansi_colors = true

config.initial_cols = 160
config.initial_rows = 40
config.window_decorations = 'TITLE | RESIZE'
config.window_background_opacity = 1.0
config.window_padding = { left = 6, right = 6, top = 4, bottom = 4 }

config.enable_tab_bar = false
config.scrollback_lines = 5000
config.exit_behavior = 'CloseOnCleanExit'
config.window_close_confirmation = 'NeverPrompt'
config.default_cursor_style = 'SteadyBar'

return config
