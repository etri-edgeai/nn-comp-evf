import torch
import torch.nn.functional as F

def temperature_scale(logits, temperature=2.0):
    """
    Scale logits by the given temperature.

    Parameters:
    logits (torch.Tensor): Model logits.
    temperature (float): Temperature for scaling.

    Returns:
    torch.Tensor: Scaled logits.
    """
    return logits / temperature


def kd_loss(student_logits, teacher_logits, labels, temperature=2.0, alpha=0.5):
    """
    Compute the combined KD loss (hard labels + soft targets).
    
    Parameters:
    student_logits (torch.Tensor): Logits from the student model.
    teacher_logits (torch.Tensor): Logits from the teacher model.
    labels (torch.Tensor): Ground truth labels.
    temperature (float): Temperature for scaling logits.
    alpha (float): Weight for the soft target loss.

    Returns:
    torch.Tensor: The total KD loss.
    """
    hard_loss = F.cross_entropy(student_logits, labels)
    soft_loss = soft_targets_loss(student_logits, teacher_logits, temperature)
    return alpha * soft_loss + (1.0 - alpha) * hard_loss


def soft_targets_loss(student_logits, teacher_logits, temperature=2.0):
    """
    Compute the soft target loss for knowledge distillation.
    
    Parameters:
    student_logits (torch.Tensor): Logits from the student model.
    teacher_logits (torch.Tensor): Logits from the teacher model.
    temperature (float): Temperature for scaling logits.

    Returns:
    torch.Tensor: The KL divergence loss.
    """
    teacher_probs = F.softmax(teacher_logits / temperature, dim=1)
    student_log_probs = F.log_softmax(student_logits / temperature, dim=1)
    return F.kl_div(student_log_probs, teacher_probs, reduction='batchmean') * (temperature ** 2)

class Optimizer:
    def __init__(self, teacher, student, temperature=2.0, alpha=0.5):
        """
        Initializes knowledge distillation between teacher and student models.

        Parameters:
        teacher (torch.nn.Module): The pre-trained teacher model.
        student (torch.nn.Module): The student model to be trained.
        temperature (float): The temperature for distillation (default is 2.0).
        alpha (float): The weight for the distillation loss (default is 0.5).
        """
        self.teacher = teacher
        self.student = student
        self.temperature = temperature
        self.alpha = alpha

    def loss_fn(self, teacher_logits, student_logits, target):
        """
        Computes the distillation loss.

        Returns:
        torch.Tensor: Combined loss.
        """
        distillation_loss = F.kl_div(
            F.log_softmax(student_logits / self.temperature, dim=1),
            F.softmax(teacher_logits / self.temperature, dim=1),
            reduction='batchmean',
        ) * (self.temperature ** 2)
        student_loss = F.cross_entropy(student_logits, target)
        return self.alpha * distillation_loss + (1 - self.alpha) * student_loss
