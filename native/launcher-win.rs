#![windows_subsystem = "windows"] // скрыть консольное окно у GUI-приложения

use std::env;
use std::process::Command;

fn main() {
    // путь к текущему exe
    let exe_path = env::current_exe().expect("Не удалось получить путь к exe");
    let dir = exe_path.parent().expect("Не удалось получить каталог");
    let dir_str = dir.to_string_lossy().into_owned();

    let alacritty = format!(r"{dir_str}\term\alacritty.exe");
    let config    = format!(r"{dir_str}\term\alacritty.toml");
    let byliner   = format!(r"{dir_str}\bylinter-cli.exe");

    let mut cmd = Command::new(&alacritty);
    cmd.arg("--config-file").arg(&config)
       .arg("--working-directory").arg(&dir_str)
       .arg("-e").arg(&byliner);

    // пробрасываем аргументы командной строки
    for arg in env::args().skip(1) {
        cmd.arg(arg);
    }

    if let Err(e) = cmd.spawn() {
        eprintln!("Не удалось запустить alacritty: {e}");
    }
}