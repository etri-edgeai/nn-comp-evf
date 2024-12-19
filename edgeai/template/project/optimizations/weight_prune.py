import torch.nn as nn
import torch.nn.utils.prune as prune


class WeightPruning:
    def __init__(self, model, amount=0.2):
        """
        Initializes weight pruning for the given model.

        Parameters:
        model (torch.nn.Module): The PyTorch model to be pruned.
        amount (float): The proportion of weights to prune (default is 0.2).
        """
        self.model = model
        self.amount = amount