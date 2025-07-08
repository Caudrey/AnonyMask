// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::{
    env,
    fs::OpenOptions,
    io::Write,
    path::PathBuf,
    process::{Command, Stdio},
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! This is Rust speaking.", name)
}

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            let current_exe = env::current_exe().expect("❌ Failed to get current exe path");
            let exe_dir = current_exe.parent().expect("❌ Failed to get exe directory");

            let mut python_backend_path = PathBuf::from(exe_dir);
            python_backend_path.push("bin");
            python_backend_path.push("main.exe");

            let mut log_path = PathBuf::from(exe_dir);
            log_path.push("backend.log");

            // Open log file for appending output
            let mut log_file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&log_path)
                .expect("❌ Failed to open backend.log");

            // Log the attempted backend path
            writeln!(log_file, "[INFO] Launching Python backend at: {:?}", python_backend_path)
                .expect("❌ Failed to write to backend.log");

            // Start the Python backend and redirect stdout/stderr to the log file
            Command::new(python_backend_path)
                .stdout(log_file.try_clone().expect("❌ Failed to clone log file for stdout"))
                .stderr(log_file)
                .spawn()
                .expect("❌ Failed to start Python backend");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("❌ Tauri error");
}


// fn main() {
//     // tauri::Builder::default()
//     //     .invoke_handler(tauri::generate_handler![run_model])
//     //     .run(tauri::generate_context!())
//     //     .expect("error while running tauri application");
// }

// use std::path::PathBuf;
// use tauri::command;
// use tch::{Tensor, CModule};

// #[command]
// fn run_model(input: Vec<f32>) -> Result<String, String> {
//     let model_path = PathBuf::from("assets/model/model.pt");

//     let model = CModule::load(&model_path)
//         .map_err(|e| format!("Failed to load model: {}", e))?;

//     let input_tensor = Tensor::of_slice(&input).view([1, input.len() as i64]);
//     let output = model
//         .forward_ts(&[input_tensor])
//         .map_err(|e| format!("Failed to run model: {}", e))?;

//     let out_vec: Vec<f32> = Vec::<f32>::from(output);
//     Ok(format!("{:?}", out_vec))
// }

