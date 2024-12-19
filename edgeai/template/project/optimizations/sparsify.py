import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.nn.utils.prune as prune

class Optimizer:
    def __init__(self, model, sparsity=0.5):
        """
        Initializes the sparsification process.

        Parameters:
        model (torch.nn.Module): The PyTorch model.
        sparsity (float): The target sparsity level (default is 0.5).
        """
        self.model = model
        self.sparsity = sparsity

    def apply(self):
        """
        Applies sparsity to the model.

        Returns:
        torch.nn.Module: The sparsified model.
        """
        for module in self.model.modules():
            if isinstance(module, nn.Linear):
                prune.random_unstructured(module, name='weight', amount=self.sparsity)
        return self.model