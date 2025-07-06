# 🎭 AnonyMask: Automated Masking and Unmasking of Explicit and Implicit Privacy Data for Secure LLM Analysis

<!-- <p align="center" width="100">

<img src="static/assets/AnonyMask.png">

</p> -->

<p align="justify">**AnonyMask** is a privacy-preserving tool designed to **automatically detect, mask, and unmask privacy data** across **various file formats**. It allows enterprises to leverage the power of Large Language Models (LLMs) while ensuring that private or confidential information remains secure and compliant. With a single click, users can anonymize both **explicit and implicit privacy data** before sending it to LLMs for analysis—and restore the original content afterward using smart unmasking. AnonyMask offers a secure, customizable, and offline-capable privacy-preserving document compatible with common file types such as .pdf, .docx, .xlsx, .csv, and .txt.</p>


# 💡 Motivation Behind AnonyMask

<p align="justify">The rapid adoption of **AI in enterprise environments**—especially for customer insights, HR analytics, financial processing, and legal document summarization—has introduced **new privacy challenges**. From medical staff pasting patient data into LLM to employees unintentionally leaking proprietary source code, real-world cases highlight how LLMs can inadvertently store and expose sensitive data.
Despite regulations such as **GDPR** and **UU PDP** in Indonesia, many users are unaware of what personal data gets extracted, how it's processed, and where it ends up. AnonyMask was created to address this gap by offering a **secure and automated masking system** before documents reach any LLM or analytics pipeline. It supports **explicit and implicit privacy data detection** and enables unmasking afterward—ensuring compliance, data protection, and peace of mind.</p>



## 🔐 Main Features

| No. | Main Features | Type                       | Description |
|:---:|:--------------|:---------------------------|:--------|
| 1.  | Masking       | **Redacted Masking**       | **Replaces all** with **`****`**, fully hiding the original content. |
|     |               | **Partial Masking**        | **Partially hides values**, showing only fragments (e.g., `J*** ***e`, `0*******1`) to retain readability. |
|     |               | **Full Masking – Category**| Replaces with its **category label** (e.g., `[Name]`, `[Email]`, `[DOB]`). |
|     |               | **Full Masking – Value**   | Replaces with **custom user input**. If not specified, it defaults to the category label. |
|     |               | **Full Masking – All Random** | Randomizes every privacy value **independently**, even if repeated data exists (e.g., `John → Axel`, next `John → Rey`). |
|     |               | **Full Masking – Same Random** | Randomizes data **consistently**, so identical inputs get the same output every time (e.g., `John → Axel`, all `John` remain `Axel`). |
| 2.  | Unmasking     | **Automatic Unmasking**    | **Restores original content** in the processed file using the token mapping log generated during masking. |


## 🧾 Why AnonyMask?

| No. | Reason                     | Description |
|:---:|:----------------------------|:------------|
| 1.  | **Automatic Privacy Data Masking** | Detects and masks both **explicit (33 labels)** and **implicit (19 labels)** privacy data using transformer-based AI models. |
| 2.  | **Multi-File Format Support**      | Supports input and output in **`.txt`, `.csv`, `.pdf`, `.docx`, `.xlsx`, and `.xls`** formats. |
| 3.  | **Secure LLM Integration**         | Prepares **privacy-safe documents**, ensuring no raw PII is exposed to external LLMs or hosted models. |
| 4.  | **Smart Unmasking**                | **Restores original content** after LLM processing using internal token mapping—seamlessly reversing the masked values. |
| 5.  | **Customizable Masking Rules**     | Allows users to define which entities to mask or exclude, offering **full control over the masking process**. |
| 6.  | **Privacy By Design**              | All processing is performed **offline and locally**—no data is sent or stored externally, ensuring full confidentiality. |
| 7.  | **Transparent Logging**            | Maintains **logs of all masking and unmasking operations** for traceability and auditability. |
| 8.  | **Multilingual Model Support**     | Automatically detects privacy data in ""multiple languages** using models like XLM-RoBERTa and paraphrase-multilingual-mpnet-base-v2. |
| 9.  | **Portable Desktop Application**   | Runs as a **standalone `.exe`** without requiring external dependencies on the user’s machine. |


## ⚙️ Requirements

- Port 4200 (Frontend - Angular)
- Port 8000 (Backend - Python masking engine)

> [! NOTE]
> No manual installation needed – just run the .exe!

## 🚀 Deployment and Usage

1. **Download the `.exe` installer** from the release section.
2. **Run the installer** – it will automatically set up everything you need.
3.  Run AnonyMask:
- Frontend UI → http://localhost:4200
- Python API → http://localhost:8000


## 🖥️ Demo for Main Features


<!-- |TITLE 1|TITLE 2|
|:---------:|:-----------------------:|
|<img src="static/assets/???.gif" width="500"> | <img src="static/assets/???.gif" width="250"> |
-->


## 👤 Authors
- [Caudrey](https://github.com/Caudrey)
- [vincent-kartamulya](https://github.com/vincent-kartamulya)
- [nadyaclrp](https://github.com/nadyaclrp)