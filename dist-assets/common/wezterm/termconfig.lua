local wezterm = require 'wezterm'

local config = {}

if wezterm.config_builder then
    config = wezterm.config_builder()
end

-- https://wezterm.org/colorschemes/
config.color_scheme = 'Argonaut'

-- список шрифтов, будем искать по порядку. можно локально положить в ./fonts
local base_font = wezterm.font_with_fallback({
    'JetBrains Mono',                -- нормально в FullHD
    'FantasqueSansM Nerd Font Mono', -- симпатичный, только в 4K
})

config.font_size = 14.0
config.font = base_font
config.font_dirs = { 'fonts' }

-- без жирных шрифтов
config.font_rules = { { intensity = 'Bold', font = base_font } }
config.bold_brightens_ansi_colors = true

config.initial_cols = 160
config.initial_rows = 38
config.window_decorations = 'TITLE | RESIZE'
config.window_background_opacity = 1.0
config.window_padding = { left = 6, right = 6, top = 4, bottom = 4 }

config.enable_tab_bar = false
config.scrollback_lines = 5000
config.exit_behavior = 'CloseOnCleanExit'
config.window_close_confirmation = 'NeverPrompt'
config.default_cursor_style = 'BlinkingBar'

wezterm.on('format-window-title', function()
    return 'Bylinter'
end)

return config
