import torch

def custom_collate_fn(batch):
    """Custom collate function for handling special batching logic."""
    return torch.utils.data.default_collate(batch)
