// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! This is Rust speaking.", name)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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

