# channel_prune.py

"""
This script provides a basic implementation for pruning less important channels from convolutional layers.

The `ChannelPruning` class takes an input model and prunes a specified proportion of channels from the convolutional layers.
Feel free to modify this template to suit your specific pruning requirements.
"""

import torch
import torch.nn as nn
import torch.nn.utils.prune as prune

class Optimizer:
    def __init__(self, model, amount=0.2):
        """
        Initializes the channel pruning process with the given model.

        Parameters:
        model (torch.nn.Module): The original PyTorch model to be pruned.
        amount (float): The proportion of channels to prune (default is 0.2).
        """
        self.model = model
        self.amount = amount

    def prune(self):
        """
        Applies channel pruning to convolutional layers of the model.

        Returns:
        torch.nn.Module: The pruned model.
        """
        for module_name, module in self.model.named_modules():
            if isinstance(module, nn.Conv2d):
                prune.ln_structured(module, name='weight', amount=self.amount, n=2, dim=0)
        return self.model