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
    """
    Optimizer class for channel pruning of convolutional layers.

    Example:
    --------
    >>> import torch.nn as nn
    >>> from channel_prune import Optimizer
    >>> model = nn.Sequential(nn.Conv2d(3, 16, 3), nn.ReLU(), nn.Conv2d(16, 32, 3))
    >>> optimizer = Optimizer(model, amount=0.3)
    >>> pruned_model = optimizer.prune()
    >>> print(pruned_model)
    """
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
    
    def unprune(self):
        """
        Removes pruning from all pruned layers in the model.

        Returns:
        torch.nn.Module: The unpruned model.
        """
        for module_name, module in self.model.named_modules():
            if isinstance(module, nn.Conv2d) and hasattr(module, 'weight_mask'):
                prune.remove(module, 'weight')
        return self.model