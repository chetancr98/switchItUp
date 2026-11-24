---
title: Machine Learning from Scratch — Data, Models, Loss & Gradient Descent
level: 1
tags: machine learning, supervised learning, gradient descent, overfitting
---
<!-- deepened -->

## Start here: the basics

### Traditional programming vs machine learning
```
Traditional:   rules + data  ──►  program  ──►  answers
               (you write: if amount > 50000 and country != home: flag_fraud)

Machine learning: data + answers  ──►  training  ──►  model (learned rules)
                  (thousands of past transactions labelled fraud / not fraud)
```
ML is useful when the rules are too complex or change too often to write by hand: spam, fraud, recommendations, speech, translation, and — at enormous scale — language itself (LLMs).

### The three main kinds of learning
| Kind | Data | Goal | Examples |
|---|---|---|---|
| **Supervised** | Inputs **with** correct answers (labels) | Predict the label for new inputs | Spam detection, price prediction, image classification |
| **Unsupervised** | Inputs **without** labels | Find structure | Customer clustering, anomaly detection, topic discovery |
| **Reinforcement** | Actions + rewards | Learn a policy that maximises reward | Game playing, robotics, RLHF for chatbots |

LLMs use **self-supervised** learning: the "label" is simply the next word in existing text, so any text becomes training data.

### Supervised learning has two flavours
- **Regression** — predict a number (house price, delivery time).
- **Classification** — predict a category (spam / not spam; which of 10 digits).

### The simplest model: a line
Predict delivery time `y` from distance `x`: `y = w·x + b`. Training means finding `w` (slope) and `b` (intercept) that make predictions close to the real data.

How close? A **loss function** measures error. For regression, **mean squared error**: average of `(prediction − actual)²`. Training = **minimise the loss**.

### Gradient descent in one picture
Imagine standing on a foggy hill (the loss surface) and wanting to reach the valley (minimum loss). You feel which way the ground slopes downward (the **gradient**) and take a small step that way (size = **learning rate**). Repeat.

```
w_new = w − learning_rate × ∂loss/∂w
b_new = b − learning_rate × ∂loss/∂b
```
**Try it live:** AI Lab → *Gradient descent* lets you watch a line learn and see what happens when the learning rate is too large.
<!-- -->

---

## Deep dive

### Gradient descent in code (NumPy)
```python
import numpy as np

rng = np.random.default_rng(0)
x = rng.uniform(0, 10, 100)
y = 2 * x + 1 + rng.normal(0, 1, 100)       # true relationship + noise

w, b, lr = 0.0, 0.0, 0.01
for step in range(2000):
    pred = w * x + b
    err = pred - y
    loss = (err ** 2).mean()
    grad_w = 2 * (err * x).mean()            # derivative of MSE w.r.t. w
    grad_b = 2 * err.mean()
    w -= lr * grad_w
    b -= lr * grad_b
print(w, b)   # ≈ 2.0, 1.0
```
Variants: **batch** (all data per step), **stochastic** (one example), **mini-batch** (e.g., 32–4096 examples — the standard), plus optimizers like **Adam** that adapt the step size per parameter.

### Classification: logistic regression
Squash `w·x + b` into a probability with the **sigmoid** `σ(z) = 1/(1+e^−z)`; loss is **cross-entropy** (penalises confident wrong answers heavily). Multi-class: **softmax** over one score per class — exactly what an LLM does over its vocabulary for every next token.

### Features
Inputs the model sees. For tabular data: numeric columns, one-hot encoded categories, scaled values. Classic ML spent most effort on **feature engineering**; deep learning learns features automatically from raw data (pixels, tokens).

### Generalisation: overfitting vs underfitting
| | Training error | Test error | Fix |
|---|---|---|---|
| **Underfitting** (too simple) | High | High | Bigger/more expressive model, better features, train longer |
| **Overfitting** (memorised noise) | Low | High | More data, regularisation (L1/L2, dropout), simpler model, early stopping, data augmentation |
| Good fit | Low | Low (close to train) | 🎉 |

The **bias–variance trade-off**: simple models have high bias (systematic error); complex models have high variance (sensitive to the particular training sample).

### Data splits
- **Training set** — fit the parameters.
- **Validation set** — choose hyperparameters (learning rate, model size), early stopping.
- **Test set** — touched once, at the end, for an honest estimate.
- **Cross-validation** — rotate validation folds when data is small.
- **Data leakage** — test information sneaking into training (e.g., normalising using statistics from the whole dataset, duplicates across splits, future data in time series). Leakage makes models look great offline and fail in production.

### Parameters vs hyperparameters
Parameters are learned (weights `w`, `b`; billions in an LLM). Hyperparameters are chosen by you (learning rate, batch size, number of layers, regularisation strength).

### Evaluation metrics
**Regression**: MAE, RMSE, R².
**Classification**:
| Metric | Formula | Use when |
|---|---|---|
| Accuracy | correct / total | Balanced classes |
| Precision | TP / (TP + FP) | False positives are costly (spam filter blocking real mail) |
| Recall | TP / (TP + FN) | Missing positives is costly (fraud, cancer screening) |
| F1 | harmonic mean of P and R | Imbalanced classes, one number |
| ROC-AUC / PR-AUC | ranking quality across thresholds | Threshold-free comparison |

Example: 1% fraud rate — a model predicting "never fraud" is 99% accurate and useless. Look at recall/precision.

### Classic algorithms to know by name
Linear/logistic regression, decision trees, **random forests** and **gradient-boosted trees** (XGBoost, LightGBM — still the best for many tabular problems), k-nearest neighbours, k-means clustering, PCA (dimensionality reduction), naive Bayes, SVMs.

### scikit-learn in 10 lines
```python
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
model = RandomForestClassifier(n_estimators=300, random_state=42)
model.fit(X_train, y_train)
print(classification_report(y_test, model.predict(X_test)))
```

### Where ML meets software engineering (your advantage)
Data pipelines, reproducibility (versioned data and code), model serving latency, monitoring for **data drift** (input distribution changes) and **concept drift** (the relationship changes), A/B testing, feature stores — this is **MLOps**, and backend engineers are well placed for it.

## Quick check questions

<details><summary>Your model has 99% training accuracy and 70% test accuracy. What's happening?</summary>

Overfitting: it memorised the training data. Add data, regularise, simplify, use early stopping, check for leakage between train and test.
</details>

<details><summary>Why not tune hyperparameters on the test set?</summary>

You'd be fitting to the test set, so its score no longer estimates performance on new data. Use a validation set or cross-validation; keep the test set for the final check.
</details>

## Questions asked at top companies

<details><summary>Explain the bias-variance trade-off. <em>· Google, Amazon, Microsoft (ML & AI roles)</em></summary>

Error = bias² + variance + irreducible noise. Simple models underfit (high bias); flexible models overfit (high variance). Regularisation, more data and model selection balance them.
</details>

<details><summary>How does gradient descent work? What if the learning rate is too high or too low? <em>· Google, Meta, Uber</em></summary>

Iteratively moves parameters opposite to the gradient of the loss. Too low: slow convergence, may stall. Too high: overshoots, oscillates or diverges. Use schedules (warm-up, decay) and adaptive optimizers (Adam).
</details>

<details><summary>Precision vs recall — give a scenario where you'd optimise each. <em>· Amazon, Flipkart, PhonePe</em></summary>

Precision: auto-blocking payments as fraud (false positives anger customers). Recall: flagging transactions for human review (missing fraud is costly). Adjust the decision threshold and report both.
</details>

<details><summary>What is overfitting and how do you prevent it? <em>· nearly every ML interview</em></summary>

The model fits noise in training data and generalises poorly. Prevent with more/augmented data, regularisation (L2, dropout), early stopping, simpler models, cross-validation, ensembling.
</details>

<details><summary>What is data leakage? Give examples. <em>· Google, Walmart</em></summary>

Information unavailable at prediction time leaks into training: features derived from the target, scaling fitted on all data, duplicate rows across splits, future records in time-series training. Causes inflated offline metrics.
</details>

<details><summary>Supervised vs unsupervised vs reinforcement learning, with examples. <em>· Microsoft, TCS (AI roles)</em></summary>

Supervised learns from labelled pairs (spam classification); unsupervised finds structure in unlabelled data (clustering customers); reinforcement learns actions from rewards (game agents, RLHF fine-tuning of chat models).
</details>

<details><summary>How do you handle class imbalance? <em>· Amazon, PhonePe, Razorpay</em></summary>

Right metrics (PR-AUC, recall), class weights, resampling (oversample minority/SMOTE, undersample majority), threshold tuning, collecting more minority examples, anomaly-detection framing.
</details>

## End-to-end scenarios

<details><summary>Scenario: Product asks you to "use AI" to predict which orders will be delivered late. Walk through the project.</summary>

Define the target precisely (late = > promised time) and the decision it supports (proactive customer messages). Gather historical orders with features available at order time only (distance, restaurant prep history, weather, time of day, rider supply). Split by time (train on past months, test on the latest) to avoid leakage. Baseline: simple rules / logistic regression; then gradient-boosted trees. Metrics: recall at a fixed precision that keeps notifications useful. Deploy behind an API, log predictions, monitor drift and real outcomes, A/B test the customer messaging impact.
</details>

<details><summary>Scenario: Should this problem use classic ML or an LLM? "Classify 2 million support emails per day into 12 categories."</summary>

At that volume with stable categories, a fine-tuned small classifier (or embeddings + logistic regression) is cheaper and faster. An LLM is excellent to bootstrap: label a few thousand emails with an LLM (+ human review), train the cheap classifier on them, and route low-confidence cases to the LLM. Compare accuracy, latency and cost per 1 000 emails before deciding.
</details>
