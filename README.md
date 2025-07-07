# 🎭 AnonyMask: Automated Masking and Unmasking of Explicit and Implicit Privacy Data

<!-- <p align="center" width="100">

<img src="static/assets/AnonyMask.png">

</p> -->

<p align="justify"><b>AnonyMask</b> is a privacy-preserving tool designed to <b>automatically detect, mask, and unmask privacy data</b> across <b>various file formats</b>. It allows enterprises to leverage the power of Large Language Model (LLM) or Retrieval-Augmented Generation (RAG) while ensuring that private or confidential information remains secure and compliant. With a single click, users can anonymize both <b>explicit and implicit privacy data</b> before sending it to LLM or RAG for analysis—and restore the original content afterward using smart unmasking. AnonyMask offers a secure, customizable, and offline-capable privacy-preserving document compatible with common file types such as .pdf, .docx, .xlsx, .csv, and .txt.</p>


# 💡 Motivation Behind AnonyMask

<p align="justify">The rapid adoption of <b>AI in enterprise environments</b>—especially for customer insights, HR analytics, financial processing, and legal document summarization—has introduced <b>new privacy challenges</b>. Real-world cases demonstrate how users—ranging from medical staff inputting patient data into LLM to employees sharing proprietary code—can unintentionally expose sensitive information when interacting with LLM or RAG systems, leading to risks of data retention, leakage, and privacy violations.
 
Despite regulations such as <b>GDPR</b> and <b>UU PDP</b> in Indonesia, many users are unaware of what personal data gets extracted, how it's processed, and where it ends up. AnonyMask was created to address this gap by offering a <b>secure and automated masking system</b> before documents reach any LLM or RAG for analysis. It supports <b>explicit and implicit privacy data detection</b> and enables unmasking afterward—ensuring compliance, data protection, and peace of mind.</p>


## 🔐 Main Features

| No. | Main Features                     | Description |
|:---:|:----------------------------|:------------|
| 1.  | **Automatic Privacy Data Masking** | Detects and masks both **explicit (33 labels)** and **implicit (19 labels)** privacy data using transformer-based AI models. |
| 2.  | **Multi-File Format Support**      | Supports input and output in **`.txt`, `.csv`, `.pdf`, `.docx`, `.xlsx`, and `.xls`** formats. |
| 3.  | **Secure LLM/RAG Integration**         | Prepares **privacy-safe documents**, ensuring no raw PII is exposed to external LLM or RAG. |
| 4.  | **Smart Unmasking**                | **Restores original content** after LLM or RAG processing using internal token mapping—seamlessly reversing the masked values. |
| 5.  | **Customizable Masking Rules**     | Allows users to define which entities to mask or exclude, offering **full control over the masking process**. |
| 6.  | **Privacy By Design**              | All processing is performed **offline and locally**—no data is sent or stored externally, ensuring full confidentiality. |
| 7.  | **Transparent Logging**            | Maintains **logs of all masking and unmasking operations** for traceability and auditability. |
| 8.  | **Multilingual Model Support**     | Automatically detects privacy data in **english and Indonesia** using models like XLM-RoBERTa and paraphrase-multilingual-mpnet-base-v2. |
| 9.  | **Portable Desktop Application**   | Runs as a **standalone `.exe`** without requiring external dependencies on the user’s machine. |

## 🧾 Your Privacy, Your Rules

| No. | Interface | Type                       | Description |
|:---:|:--------------|:---------------------------|:--------|
| 1.  | Masking       | **Redacted Masking**       | **Replaces all** with **`****`**, fully hiding the original content. |
|     |               | **Partial Masking**        | **Partially hides values**, showing only fragments (e.g., `J*** ***e`, `0*******1`) to retain readability. |
|     |               | **Full Masking – Category**| Replaces with its **category label** (e.g., `[Name]`, `[Email]`, `[DOB]`). |
|     |               | **Full Masking – Value**   | Replaces with **custom user input**. If not specified, it defaults to the category label. |
|     |               | **Full Masking – All Random** | Randomizes every privacy value **independently**, even if repeated data exists (e.g., `John → Axel`, next `John → Rey`). |
|     |               | **Full Masking – Same Random** | Randomizes data **consistently**, so identical inputs get the same output every time (e.g., `John → Axel`, all `John` remain `Axel`). |
| 2.  | Unmasking     | **Automatic Unmasking**    | **Restores original content** in the processed file using the token mapping log generated during masking. |



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