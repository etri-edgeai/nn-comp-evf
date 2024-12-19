import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.nn.utils.prune as prune

class Sparsify:
    def __init__(self, model, sparsity=0.5):

        self.model = model
        self.sparsity = sparsity

    def apply(self):
        for module in self.model.modules():
            if isinstance(module, nn.Linear):
                prune.random_unstructured(module, name='weight', amount=self.sparsity)
        return self.model