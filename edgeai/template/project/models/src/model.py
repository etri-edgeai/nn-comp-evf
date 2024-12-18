import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

class Model(nn.Module):
    """
    EfficientNet-B0 model with customization options for CIFAR100 or other datasets.
    """
    def __init__(self, num_classes: int = 100, pretrained: bool = True, fine_tune: bool = True):
        """
        Initialize the EfficientNet-B0 model.

        Args:
            num_classes (int): Number of output classes. Default is 100.
            pretrained (bool): Use pretrained ImageNet weights. Default is True.
            fine_tune (bool): Fine-tune the model if True. Default is True.
        """
        super(Model, self).__init__()

        # Load the pretrained EfficientNet-B0 model
        weights = EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
        self.efficientnet = efficientnet_b0(weights=weights)

        # Modify the classifier head
        in_features = self.efficientnet.classifier[1].in_features
        self.efficientnet.classifier = nn.Sequential(
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(in_features, num_classes)
        )

        # Fine-tune or freeze parameters
        if not fine_tune:
            for param in self.efficientnet.features.parameters():
                param.requires_grad = False

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass for the model."""
        return self.efficientnet(x)

if __name__ == "__main__":
    model = Model(num_classes=10, pretrained=True, fine_tune=True)
    print(model)
