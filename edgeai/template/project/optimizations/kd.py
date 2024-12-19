import torch
import torch.nn.functional as F


class KnowledgeDistillation:
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