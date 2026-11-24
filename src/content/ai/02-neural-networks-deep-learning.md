---
title: Neural Networks & Deep Learning — Neurons, Backprop and Training
level: 2
tags: neural networks, deep learning, backpropagation, pytorch
---
<!-- deepened -->

## Start here: the basics

### A neuron is a tiny formula
A single artificial neuron takes inputs, multiplies each by a weight, adds a bias, and passes the sum through an **activation function**:

```
inputs x1, x2, x3 ──► z = w1·x1 + w2·x2 + w3·x3 + b ──► a = activation(z) ──► output
```
With no activation it's just linear regression. The activation adds **non-linearity**, which lets networks represent curves, not just straight lines.

Common activations:
| Name | Formula | Notes |
|---|---|---|
| ReLU | max(0, z) | Default for hidden layers; cheap |
| GELU / SiLU | smooth ReLU variants | Used in transformers |
| Sigmoid | 1/(1+e^−z) | Output probability for yes/no |
| Softmax | e^zi / Σ e^zj | Probabilities across many classes (or next tokens) |

### Layers make a network
```
input layer      hidden layers           output layer
 (pixels)    ──► [neurons] ──► [neurons] ──► (10 digit probabilities)
```
Each layer's outputs become the next layer's inputs. "**Deep** learning" = many layers. Early layers learn simple patterns (edges, character pairs); later layers combine them into complex ones (faces, meaning).

### Training = forward pass, loss, backward pass, update
1. **Forward pass**: feed inputs through the network → predictions.
2. **Loss**: compare predictions to the truth.
3. **Backward pass (backpropagation)**: compute how much each weight contributed to the loss (gradients), using the chain rule from calculus, layer by layer backwards.
4. **Update**: gradient descent nudges every weight.
Repeat over many **mini-batches** and **epochs** (passes over the dataset).

**Try it**: the TensorFlow Playground link at the end lets you train a small network in your browser and watch it learn.
<!-- -->

---

## Deep dive

### A two-layer network from scratch in NumPy
```python
import numpy as np

rng = np.random.default_rng(0)
# toy data: is the point inside a circle? (not linearly separable)
X = rng.uniform(-1, 1, (500, 2))
y = ((X ** 2).sum(axis=1) < 0.5).astype(float).reshape(-1, 1)

W1 = rng.normal(0, 0.5, (2, 16)); b1 = np.zeros(16)
W2 = rng.normal(0, 0.5, (16, 1)); b2 = np.zeros(1)
sigmoid = lambda z: 1 / (1 + np.exp(-z))
lr = 0.5

for epoch in range(2000):
    # forward
    z1 = X @ W1 + b1;  a1 = np.maximum(0, z1)          # ReLU hidden layer
    z2 = a1 @ W2 + b2; p = sigmoid(z2)                  # output probability
    loss = -np.mean(y * np.log(p + 1e-9) + (1 - y) * np.log(1 - p + 1e-9))   # binary cross-entropy
    # backward (chain rule)
    dz2 = (p - y) / len(X)                  # gradient of BCE + sigmoid
    dW2 = a1.T @ dz2;  db2 = dz2.sum(axis=0)
    da1 = dz2 @ W2.T
    dz1 = da1 * (z1 > 0)                    # ReLU derivative
    dW1 = X.T @ dz1;   db1 = dz1.sum(axis=0)
    # update
    W1 -= lr * dW1; b1 -= lr * db1; W2 -= lr * dW2; b2 -= lr * db2

acc = ((p > 0.5) == y).mean()
print(f"loss {loss:.3f}, accuracy {acc:.2%}")    # ≈ 95%+
```
Understanding this loop — forward, loss, gradients, update — is what interviewers want when they ask "explain backprop".

### The same thing in PyTorch (how it's done in practice)
```python
import torch, torch.nn as nn

model = nn.Sequential(nn.Linear(2, 16), nn.ReLU(), nn.Linear(16, 1))
opt = torch.optim.Adam(model.parameters(), lr=0.01)
loss_fn = nn.BCEWithLogitsLoss()
Xt, yt = torch.tensor(X, dtype=torch.float32), torch.tensor(y, dtype=torch.float32)

for epoch in range(500):
    opt.zero_grad()
    loss = loss_fn(model(Xt), yt)
    loss.backward()              # autograd computes every gradient for you
    opt.step()
```
**Autograd** records operations and applies the chain rule automatically; GPUs run the matrix multiplications in parallel.

### Important training concepts
| Concept | Meaning |
|---|---|
| Epoch / batch / iteration | Full pass over data / subset per step / one update |
| Optimizers | SGD, SGD+momentum, **Adam/AdamW** (default for transformers) |
| Learning-rate schedule | Warm-up then decay (cosine) — crucial for large models |
| Vanishing / exploding gradients | Gradients shrink/grow through many layers → ReLU-family activations, residual connections, normalisation, gradient clipping |
| Normalisation | BatchNorm (vision), **LayerNorm** (transformers) stabilise training |
| Regularisation | Dropout, weight decay, data augmentation, early stopping |
| Initialisation | Scaled random init (Xavier/He) so signals don't vanish at the start |

### Architectures (what each is for)
| Architecture | Data | Idea |
|---|---|---|
| MLP (fully connected) | Tabular, small inputs | Every neuron connects to every input |
| CNN | Images, audio | Convolution filters slide over local regions; weight sharing |
| RNN / LSTM | Sequences (historic) | Hidden state carried step by step; slow, struggles with long context |
| **Transformer** | Text, code, images, audio — almost everything now | **Attention** lets every position look at every other position in parallel (next module) |
| Diffusion models | Image/video generation | Learn to reverse gradual noising |

### Embeddings — the bridge to LLMs
A neural network can map discrete things (words, products, users) to dense vectors where **similar things are close**. The network learns these vectors because placing similar items close together helps it reduce its loss. Embeddings power search, recommendations and RAG.

### Scale: why "large" language models
LLM performance improves predictably as you scale parameters, data and compute (**scaling laws**). Training frontier models costs tens to hundreds of millions of dollars of compute; that's why most engineers **use** foundation models through APIs or fine-tune open-weight models rather than training from scratch.

### Inference vs training
Training: forward + backward passes over huge datasets on many GPUs for weeks. Inference: forward passes only, per request, where latency and cost per token matter — the part you deal with as an AI engineer.

## Quick check questions

<details><summary>Why do neural networks need non-linear activation functions?</summary>

Stacked linear layers collapse into a single linear transformation, so depth would add nothing. Non-linearities let networks approximate complex functions.
</details>

<details><summary>What does `loss.backward()` do in PyTorch?</summary>

Runs backpropagation through the recorded computation graph, computing the gradient of the loss with respect to every parameter and storing it in `.grad`; `optimizer.step()` then uses those gradients.
</details>

## Questions asked at top companies

<details><summary>Explain backpropagation. <em>· Google, Meta, Microsoft (ML roles)</em></summary>

The chain rule applied efficiently from the output back to the inputs: each layer receives the gradient of the loss w.r.t. its output, computes gradients for its parameters and the gradient w.r.t. its input, and passes that backward. Reuses intermediate forward values; cost is about the same order as the forward pass.
</details>

<details><summary>What are vanishing and exploding gradients, and how are they solved? <em>· Google, Amazon</em></summary>

Repeated multiplication of small/large derivatives across many layers shrinks/explodes gradients. Fixes: ReLU-family activations, careful initialisation, residual (skip) connections, normalisation layers, gradient clipping, LSTMs/transformers instead of vanilla RNNs.
</details>

<details><summary>What is dropout? <em>· Microsoft, Uber</em></summary>

During training, randomly zeroes a fraction of activations, preventing co-adaptation and acting as regularisation; disabled at inference (with scaling so expected values match).
</details>

<details><summary>CNN vs RNN vs Transformer — when each? <em>· Amazon, Meta</em></summary>

CNNs for spatial/local patterns (images); RNNs for sequences historically but sequential and weak on long-range dependencies; transformers handle long-range dependencies with parallel attention and now dominate text, code, vision and multimodal tasks.
</details>

<details><summary>Batch size trade-offs? <em>· Google, NVIDIA-style questions</em></summary>

Larger batches: more stable gradients and better hardware utilisation, but more memory and sometimes worse generalisation (need LR scaling). Smaller: noisier updates that can regularise, less memory, slower per epoch.
</details>

<details><summary>What is transfer learning / fine-tuning? <em>· AI startups, Microsoft</em></summary>

Start from a model pre-trained on large data and continue training on a smaller task-specific dataset (full fine-tuning or parameter-efficient methods like LoRA), getting strong results with far less data and compute.
</details>

## End-to-end scenarios

<details><summary>Scenario: Your training loss goes down but validation loss starts rising after epoch 5. What do you do?</summary>

Overfitting after epoch 5: use early stopping (checkpoint at best validation), add regularisation (dropout, weight decay), augment data, reduce model capacity, gather more data; verify no train/val distribution mismatch or leakage; tune learning-rate schedule.
</details>

<details><summary>Scenario: Explain to a non-technical stakeholder how a neural network "learns" to recognise defective products in photos.</summary>

Show it thousands of photos labelled good/defective. It starts guessing randomly; after each batch it measures how wrong it was and slightly adjusts millions of internal dials to be less wrong next time. Over many rounds the dials settle into patterns that detect scratches and dents. We check it on photos it has never seen to make sure it learned real defects, not quirks of the training photos.
</details>
