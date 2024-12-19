import torch.nn as nn
import torch.nn.utils.prune as prune


class WeightPruning:
    def __init__(self, model, amount=0.2):

        self.model = model
        self.amount = amount
    
    def prune(self):
        """
        Applies weight pruning to the model.

        Returns:
        torch.nn.Module: The pruned model.
        """
        for module in self.model.modules():
            if isinstance(module, (nn.Conv2d, nn.Linear)):
                prune.l1_unstructured(module, name='weight', amount=self.amount)
        return self.model
    
    def unprune(self):
        """
        Removes pruning masks from the model.

        Returns:
        torch.nn.Module: The unpruned model.
        """
        for module in self.model.modules():
            if isinstance(module, (nn.Conv2d, nn.Linear)) and hasattr(module, 'weight_mask'):
                prune.remove(module, 'weight')
        return self.model