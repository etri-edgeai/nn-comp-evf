# Configuration for CIFAR100 dataset
import os
import yaml
import json
from torchvision import datasets, transforms
import torch
from torch.utils.data import Dataset as TorchDataset
import torchvision.transforms as T
from torchvision.datasets import CIFAR100
from tqdm import tqdm
import urllib.request

class Dataset(TorchDataset):
    def __init__(self, root: str = "/Data1/CIFAR100/", train: bool = True, download: bool = True, 
                 transform=None, target_transform=None):
        """
        A simple wrapper around the torchvision CIFAR100 dataset.

        Args:
            root (str): Root directory where CIFAR100 data is stored or will be downloaded.
            train (bool): If True, load the training split; otherwise load the test split.
            download (bool): Whether to download the dataset if not found in `root`.
            transform (callable, optional): A function/transform that takes in a PIL image
                                            and returns a transformed version.
            target_transform (callable, optional): A function/transform that takes in the target
                                                   and transforms it.
        """
        # Default transforms if none provided
        if transform is None:
            transform = T.Compose([
                T.Resize((224, 224)),
                T.ToTensor(),
                T.Normalize((0.5071, 0.4865, 0.4409), (0.2673, 0.2564, 0.2762))
            ])

        # Override default download progress with custom one
        def custom_progress_hook(t):
            def inner(b=1, bsize=1, tsize=None):
                if tsize is not None:
                    t.total = tsize
                t.update(b * bsize)
            return inner

        # Override the urllib.request.urlretrieve to use our custom progress bar
        original_urlretrieve = urllib.request.urlretrieve
        def custom_urlretrieve(url, filename, reporthook=None, data=None):
            with tqdm(unit='B', unit_scale=True, unit_divisor=1024, miniters=1,
                     desc='Downloading CIFAR100', position=0, leave=False) as t:
                return original_urlretrieve(url, filename,
                                         reporthook=custom_progress_hook(t),
                                         data=data)

        # Patch the urlretrieve for this download
        urllib.request.urlretrieve = custom_urlretrieve

        try:
            self.dataset = CIFAR100(root=root,
                                  train=train, 
                                  download=download,
                                  transform=transform, 
                                  target_transform=target_transform)
        finally:
            # Restore original urlretrieve
            urllib.request.urlretrieve = original_urlretrieve

    def __getitem__(self, index: int):
        return self.dataset[index]

    def __len__(self):
        return len(self.dataset)