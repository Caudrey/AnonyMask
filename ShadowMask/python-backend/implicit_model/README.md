---
tags:
- setfit
- sentence-transformers
- text-classification
- generated_from_setfit_trainer
widget:
- text: 'Agus: iya, asli banget! sekarang sih saya tinggal di bekasi karena kerja
    di sana. Jonathan: bekasi juga keren, ya. lumayan jauh juga sih dari jakarta.
    Agus: iya, tapi enak, lebih tenang daripada jakarta.'
- text: 'Rizky: iya, yang tiap bulan orang harus bayar tagihan ke mereka? Hendra:
    betul! saya dulu di pln, bagian distribusi tenaga listrik. Yusuf: berarti tiap
    hari urusan sama daya listrik ya?'
- text: 'Dian: iya, memang kebetulan. Eka: ah, nama adira itu diambil dari nama orang
    tua kamu ya? Dian: iya, benar. nama adira itu gabungan dari nama bapak saya dan
    ibu aku.'
- text: 'Mila: saya lahir di ‘kota yang ada di ujung timur pulau jawa dan terkenal
    sama taman nasionalnya’. Doni: wah, yang juga punya pantai dengan ombak tinggi
    buat surfing? Sari: iya, yang sering disebut "the sunrise of java"?'
- text: 'Rudi: kemarin saya lihat acara wisuda di kampus tempatku dulu belajar tentang
    kelistrikan. Joko: wah, yang banyak alumninya jadi insinyur itu ya? Rudi: iya,
    saya lulus sekitar 5 tahun lalu dari sana, banyak kenangan di laboratorium listrik.'
metrics:
- accuracy
pipeline_tag: text-classification
library_name: setfit
inference: false
model-index:
- name: SetFit
  results:
  - task:
      type: text-classification
      name: Text Classification
    dataset:
      name: Unknown
      type: unknown
      split: test
    metrics:
    - type: accuracy
      value: 0.88125
      name: Accuracy
---

# SetFit

This is a [SetFit](https://github.com/huggingface/setfit) model that can be used for Text Classification. A OneVsRestClassifier instance is used for classification.

The model has been trained using an efficient few-shot learning technique that involves:

1. Fine-tuning a [Sentence Transformer](https://www.sbert.net) with contrastive learning.
2. Training a classification head with features from the fine-tuned Sentence Transformer.

## Model Details

### Model Description
- **Model Type:** SetFit
<!-- - **Sentence Transformer:** [Unknown](https://huggingface.co/unknown) -->
- **Classification head:** a OneVsRestClassifier instance
- **Maximum Sequence Length:** 512 tokens
<!-- - **Number of Classes:** Unknown -->
<!-- - **Training Dataset:** [Unknown](https://huggingface.co/datasets/unknown) -->
<!-- - **Language:** Unknown -->
<!-- - **License:** Unknown -->

### Model Sources

- **Repository:** [SetFit on GitHub](https://github.com/huggingface/setfit)
- **Paper:** [Efficient Few-Shot Learning Without Prompts](https://arxiv.org/abs/2209.11055)
- **Blogpost:** [SetFit: Efficient Few-Shot Learning Without Prompts](https://huggingface.co/blog/setfit)

## Evaluation

### Metrics
| Label   | Accuracy |
|:--------|:---------|
| **all** | 0.8812   |

## Uses

### Direct Use for Inference

First install the SetFit library:

```bash
pip install setfit
```

Then you can load this model and run inference.

```python
from setfit import SetFitModel

# Download from the 🤗 Hub
model = SetFitModel.from_pretrained("setfit_model_id")
# Run inference
preds = model("Dian: iya, memang kebetulan. Eka: ah, nama adira itu diambil dari nama orang tua kamu ya? Dian: iya, benar. nama adira itu gabungan dari nama bapak saya dan ibu aku.")
```

<!--
### Downstream Use

*List how someone could finetune this model on their own dataset.*
-->

<!--
### Out-of-Scope Use

*List how the model may foreseeably be misused and address what users ought not to do with the model.*
-->

<!--
## Bias, Risks and Limitations

*What are the known or foreseeable issues stemming from this model? You could also flag here known failure cases or weaknesses of the model.*
-->

<!--
### Recommendations

*What are recommendations with respect to the foreseeable issues? For example, filtering explicit content.*
-->

## Training Details

### Training Set Metrics
| Training set | Min | Median | Max |
|:-------------|:----|:-------|:----|
| Word count   | 12  | 34.8   | 104 |

### Training Hyperparameters
- batch_size: (16, 16)
- num_epochs: (3, 3)
- max_steps: -1
- sampling_strategy: oversampling
- num_iterations: 20
- body_learning_rate: (2e-05, 2e-05)
- head_learning_rate: 2e-05
- loss: CosineSimilarityLoss
- distance_metric: cosine_distance
- margin: 0.25
- end_to_end: False
- use_amp: False
- warmup_proportion: 0.1
- l2_weight: 0.01
- seed: 42
- eval_max_steps: -1
- load_best_model_at_end: False

### Training Results
| Epoch  | Step | Training Loss | Validation Loss |
|:------:|:----:|:-------------:|:---------------:|
| 0.0003 | 1    | 0.22          | -               |
| 0.0156 | 50   | 0.2389        | -               |
| 0.0312 | 100  | 0.2034        | -               |
| 0.0469 | 150  | 0.1928        | -               |
| 0.0625 | 200  | 0.1661        | -               |
| 0.0781 | 250  | 0.1307        | -               |
| 0.0938 | 300  | 0.1143        | -               |
| 0.1094 | 350  | 0.0969        | -               |
| 0.125  | 400  | 0.0775        | -               |
| 0.1406 | 450  | 0.073         | -               |
| 0.1562 | 500  | 0.0644        | -               |
| 0.1719 | 550  | 0.0551        | -               |
| 0.1875 | 600  | 0.0474        | -               |
| 0.2031 | 650  | 0.0398        | -               |
| 0.2188 | 700  | 0.0406        | -               |
| 0.2344 | 750  | 0.0367        | -               |
| 0.25   | 800  | 0.0273        | -               |
| 0.2656 | 850  | 0.0278        | -               |
| 0.2812 | 900  | 0.0296        | -               |
| 0.2969 | 950  | 0.0201        | -               |
| 0.3125 | 1000 | 0.0191        | -               |
| 0.3281 | 1050 | 0.0167        | -               |
| 0.3438 | 1100 | 0.0182        | -               |
| 0.3594 | 1150 | 0.0159        | -               |
| 0.375  | 1200 | 0.0113        | -               |
| 0.3906 | 1250 | 0.0105        | -               |
| 0.4062 | 1300 | 0.0097        | -               |
| 0.4219 | 1350 | 0.0074        | -               |
| 0.4375 | 1400 | 0.008         | -               |
| 0.4531 | 1450 | 0.0052        | -               |
| 0.4688 | 1500 | 0.0042        | -               |
| 0.4844 | 1550 | 0.0046        | -               |
| 0.5    | 1600 | 0.0072        | -               |
| 0.5156 | 1650 | 0.0055        | -               |
| 0.5312 | 1700 | 0.004         | -               |
| 0.5469 | 1750 | 0.0036        | -               |
| 0.5625 | 1800 | 0.0048        | -               |
| 0.5781 | 1850 | 0.0079        | -               |
| 0.5938 | 1900 | 0.0056        | -               |
| 0.6094 | 1950 | 0.0063        | -               |
| 0.625  | 2000 | 0.0051        | -               |
| 0.6406 | 2050 | 0.0036        | -               |
| 0.6562 | 2100 | 0.0067        | -               |
| 0.6719 | 2150 | 0.0047        | -               |
| 0.6875 | 2200 | 0.0024        | -               |
| 0.7031 | 2250 | 0.0032        | -               |
| 0.7188 | 2300 | 0.0026        | -               |
| 0.7344 | 2350 | 0.0022        | -               |
| 0.75   | 2400 | 0.0029        | -               |
| 0.7656 | 2450 | 0.002         | -               |
| 0.7812 | 2500 | 0.0017        | -               |
| 0.7969 | 2550 | 0.0029        | -               |
| 0.8125 | 2600 | 0.001         | -               |
| 0.8281 | 2650 | 0.0027        | -               |
| 0.8438 | 2700 | 0.002         | -               |
| 0.8594 | 2750 | 0.0026        | -               |
| 0.875  | 2800 | 0.0017        | -               |
| 0.8906 | 2850 | 0.0027        | -               |
| 0.9062 | 2900 | 0.0019        | -               |
| 0.9219 | 2950 | 0.0015        | -               |
| 0.9375 | 3000 | 0.0014        | -               |
| 0.9531 | 3050 | 0.0021        | -               |
| 0.9688 | 3100 | 0.0012        | -               |
| 0.9844 | 3150 | 0.0017        | -               |
| 1.0    | 3200 | 0.001         | -               |
| 1.0156 | 3250 | 0.0015        | -               |
| 1.0312 | 3300 | 0.0011        | -               |
| 1.0469 | 3350 | 0.0026        | -               |
| 1.0625 | 3400 | 0.0021        | -               |
| 1.0781 | 3450 | 0.0011        | -               |
| 1.0938 | 3500 | 0.0008        | -               |
| 1.1094 | 3550 | 0.001         | -               |
| 1.125  | 3600 | 0.0007        | -               |
| 1.1406 | 3650 | 0.0018        | -               |
| 1.1562 | 3700 | 0.001         | -               |
| 1.1719 | 3750 | 0.0017        | -               |
| 1.1875 | 3800 | 0.0012        | -               |
| 1.2031 | 3850 | 0.0019        | -               |
| 1.2188 | 3900 | 0.0009        | -               |
| 1.2344 | 3950 | 0.0016        | -               |
| 1.25   | 4000 | 0.0011        | -               |
| 1.2656 | 4050 | 0.001         | -               |
| 1.2812 | 4100 | 0.0014        | -               |
| 1.2969 | 4150 | 0.0009        | -               |
| 1.3125 | 4200 | 0.0011        | -               |
| 1.3281 | 4250 | 0.003         | -               |
| 1.3438 | 4300 | 0.0025        | -               |
| 1.3594 | 4350 | 0.0017        | -               |
| 1.375  | 4400 | 0.0012        | -               |
| 1.3906 | 4450 | 0.0012        | -               |
| 1.4062 | 4500 | 0.0013        | -               |
| 1.4219 | 4550 | 0.0009        | -               |
| 1.4375 | 4600 | 0.0013        | -               |
| 1.4531 | 4650 | 0.001         | -               |
| 1.4688 | 4700 | 0.0014        | -               |
| 1.4844 | 4750 | 0.0007        | -               |
| 1.5    | 4800 | 0.0014        | -               |
| 1.5156 | 4850 | 0.0019        | -               |
| 1.5312 | 4900 | 0.0014        | -               |
| 1.5469 | 4950 | 0.0008        | -               |
| 1.5625 | 5000 | 0.0018        | -               |
| 1.5781 | 5050 | 0.0013        | -               |
| 1.5938 | 5100 | 0.0009        | -               |
| 1.6094 | 5150 | 0.0011        | -               |
| 1.625  | 5200 | 0.0009        | -               |
| 1.6406 | 5250 | 0.0007        | -               |
| 1.6562 | 5300 | 0.0008        | -               |
| 1.6719 | 5350 | 0.0011        | -               |
| 1.6875 | 5400 | 0.0008        | -               |
| 1.7031 | 5450 | 0.0018        | -               |
| 1.7188 | 5500 | 0.0019        | -               |
| 1.7344 | 5550 | 0.0007        | -               |
| 1.75   | 5600 | 0.0011        | -               |
| 1.7656 | 5650 | 0.0013        | -               |
| 1.7812 | 5700 | 0.0022        | -               |
| 1.7969 | 5750 | 0.0011        | -               |
| 1.8125 | 5800 | 0.002         | -               |
| 1.8281 | 5850 | 0.0038        | -               |
| 1.8438 | 5900 | 0.0044        | -               |
| 1.8594 | 5950 | 0.0048        | -               |
| 1.875  | 6000 | 0.005         | -               |
| 1.8906 | 6050 | 0.0008        | -               |
| 1.9062 | 6100 | 0.0012        | -               |
| 1.9219 | 6150 | 0.0025        | -               |
| 1.9375 | 6200 | 0.0018        | -               |
| 1.9531 | 6250 | 0.0014        | -               |
| 1.9688 | 6300 | 0.0007        | -               |
| 1.9844 | 6350 | 0.0015        | -               |
| 2.0    | 6400 | 0.0012        | -               |
| 2.0156 | 6450 | 0.001         | -               |
| 2.0312 | 6500 | 0.0014        | -               |
| 2.0469 | 6550 | 0.0007        | -               |
| 2.0625 | 6600 | 0.0006        | -               |
| 2.0781 | 6650 | 0.0009        | -               |
| 2.0938 | 6700 | 0.0013        | -               |
| 2.1094 | 6750 | 0.0011        | -               |
| 2.125  | 6800 | 0.0009        | -               |
| 2.1406 | 6850 | 0.001         | -               |
| 2.1562 | 6900 | 0.0016        | -               |
| 2.1719 | 6950 | 0.0013        | -               |
| 2.1875 | 7000 | 0.0022        | -               |
| 2.2031 | 7050 | 0.0008        | -               |
| 2.2188 | 7100 | 0.0026        | -               |
| 2.2344 | 7150 | 0.0005        | -               |
| 2.25   | 7200 | 0.0009        | -               |
| 2.2656 | 7250 | 0.0007        | -               |
| 2.2812 | 7300 | 0.0008        | -               |
| 2.2969 | 7350 | 0.0016        | -               |
| 2.3125 | 7400 | 0.0017        | -               |
| 2.3281 | 7450 | 0.0005        | -               |
| 2.3438 | 7500 | 0.0007        | -               |
| 2.3594 | 7550 | 0.001         | -               |
| 2.375  | 7600 | 0.0012        | -               |
| 2.3906 | 7650 | 0.0007        | -               |
| 2.4062 | 7700 | 0.0006        | -               |
| 2.4219 | 7750 | 0.001         | -               |
| 2.4375 | 7800 | 0.0015        | -               |
| 2.4531 | 7850 | 0.001         | -               |
| 2.4688 | 7900 | 0.0006        | -               |
| 2.4844 | 7950 | 0.0015        | -               |
| 2.5    | 8000 | 0.0007        | -               |
| 2.5156 | 8050 | 0.0008        | -               |
| 2.5312 | 8100 | 0.0009        | -               |
| 2.5469 | 8150 | 0.0008        | -               |
| 2.5625 | 8200 | 0.0006        | -               |
| 2.5781 | 8250 | 0.0011        | -               |
| 2.5938 | 8300 | 0.0013        | -               |
| 2.6094 | 8350 | 0.0015        | -               |
| 2.625  | 8400 | 0.0023        | -               |
| 2.6406 | 8450 | 0.0006        | -               |
| 2.6562 | 8500 | 0.0025        | -               |
| 2.6719 | 8550 | 0.0007        | -               |
| 2.6875 | 8600 | 0.0005        | -               |
| 2.7031 | 8650 | 0.0008        | -               |
| 2.7188 | 8700 | 0.001         | -               |
| 2.7344 | 8750 | 0.0005        | -               |
| 2.75   | 8800 | 0.0008        | -               |
| 2.7656 | 8850 | 0.0013        | -               |
| 2.7812 | 8900 | 0.0007        | -               |
| 2.7969 | 8950 | 0.0014        | -               |
| 2.8125 | 9000 | 0.0004        | -               |
| 2.8281 | 9050 | 0.0015        | -               |
| 2.8438 | 9100 | 0.0005        | -               |
| 2.8594 | 9150 | 0.0013        | -               |
| 2.875  | 9200 | 0.0012        | -               |
| 2.8906 | 9250 | 0.0011        | -               |
| 2.9062 | 9300 | 0.0007        | -               |
| 2.9219 | 9350 | 0.001         | -               |
| 2.9375 | 9400 | 0.0005        | -               |
| 2.9531 | 9450 | 0.001         | -               |
| 2.9688 | 9500 | 0.0009        | -               |
| 2.9844 | 9550 | 0.0008        | -               |
| 3.0    | 9600 | 0.0005        | -               |

### Framework Versions
- Python: 3.10.12
- SetFit: 1.1.2
- Sentence Transformers: 3.3.1
- Transformers: 4.47.0
- PyTorch: 2.5.1+cu121
- Datasets: 3.3.1
- Tokenizers: 0.21.0

## Citation

### BibTeX
```bibtex
@article{https://doi.org/10.48550/arxiv.2209.11055,
    doi = {10.48550/ARXIV.2209.11055},
    url = {https://arxiv.org/abs/2209.11055},
    author = {Tunstall, Lewis and Reimers, Nils and Jo, Unso Eun Seo and Bates, Luke and Korat, Daniel and Wasserblat, Moshe and Pereg, Oren},
    keywords = {Computation and Language (cs.CL), FOS: Computer and information sciences, FOS: Computer and information sciences},
    title = {Efficient Few-Shot Learning Without Prompts},
    publisher = {arXiv},
    year = {2022},
    copyright = {Creative Commons Attribution 4.0 International}
}
```

<!--
## Glossary

*Clearly define terms in order to be accessible across audiences.*
-->

<!--
## Model Card Authors

*Lists the people who create the model card, providing recognition and accountability for the detailed work that goes into its construction.*
-->

<!--
## Model Card Contact

*Provides a way for people who have updates to the Model Card, suggestions, or questions, to contact the Model Card authors.*
-->