use std::env;
use std::os::unix::process::CommandExt;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    let exe = env::current_exe().expect("не удалось получить путь к exe");
    let dir: PathBuf = exe
        .parent()
        .expect("не удалось получить родительский каталог")
        .to_path_buf();
    let dir_str = dir.to_string_lossy().into_owned();

    let alacritty = dir.join("term").join("alacritty.AppImage");
    let config    = dir.join("term").join("alacritty.toml");
    let byliner   = dir.join("bylinter-cli");

    let mut cmd = Command::new(&alacritty);
    cmd.arg("--config-file").arg(&config)
       .arg("--working-directory").arg(&dir_str)
       .arg("-e").arg(&byliner);

    // пробрасываем аргументы исходной командной строки
    for arg in env::args().skip(1) {
        cmd.arg(arg);
    }

    let err = cmd.exec();
    eprintln!("execv failed: {err}");
    std::process::exit(1);
}
