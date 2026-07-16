#include "SeedResident.h"
#include "SeedWorldDirector.h"

#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

namespace
{
    UMaterialInstanceDynamic* ResidentMaterial(UObject* Owner, const FLinearColor& Color)
    {
        UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
        UMaterialInstanceDynamic* Material = UMaterialInstanceDynamic::Create(Base, Owner);
        if (Material)
        {
            Material->SetVectorParameterValue(TEXT("Color"), Color);
        }
        return Material;
    }
}

ASeedResident::ASeedResident()
{
    PrimaryActorTick.bCanEverTick = true;
    Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(Root);

    Torso = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Torso"));
    Head = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Head"));
    LeftArm = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftArm"));
    RightArm = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightArm"));
    LeftLeg = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftLeg"));
    RightLeg = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightLeg"));
    Parcel = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Parcel"));

    TArray<UStaticMeshComponent*> Pieces = { Torso, Head, LeftArm, RightArm, LeftLeg, RightLeg, Parcel };
    for (UStaticMeshComponent* Piece : Pieces)
    {
        Piece->SetupAttachment(Root);
        Piece->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    }

    UStaticMesh* Cylinder = LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    UStaticMesh* Sphere = LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    UStaticMesh* Cube = LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Cube.Cube"));
    Torso->SetStaticMesh(Cylinder);
    Head->SetStaticMesh(Sphere);
    LeftArm->SetStaticMesh(Cylinder);
    RightArm->SetStaticMesh(Cylinder);
    LeftLeg->SetStaticMesh(Cylinder);
    RightLeg->SetStaticMesh(Cylinder);
    Parcel->SetStaticMesh(Cube);

    Torso->SetRelativeLocation(FVector(0.f, 0.f, 96.f));
    Torso->SetRelativeScale3D(FVector(.34f, .34f, .70f));
    Head->SetRelativeLocation(FVector(0.f, 0.f, 180.f));
    Head->SetRelativeScale3D(FVector(.28f));
    LeftArm->SetRelativeLocation(FVector(0.f, -38.f, 114.f));
    RightArm->SetRelativeLocation(FVector(0.f, 38.f, 114.f));
    LeftArm->SetRelativeScale3D(FVector(.13f, .13f, .52f));
    RightArm->SetRelativeScale3D(FVector(.13f, .13f, .52f));
    LeftLeg->SetRelativeLocation(FVector(0.f, -16.f, 38.f));
    RightLeg->SetRelativeLocation(FVector(0.f, 16.f, 38.f));
    LeftLeg->SetRelativeScale3D(FVector(.15f, .15f, .56f));
    RightLeg->SetRelativeScale3D(FVector(.15f, .15f, .56f));
    Parcel->SetRelativeLocation(FVector(48.f, 0.f, 90.f));
    Parcel->SetRelativeScale3D(FVector(.16f));
    Parcel->SetVisibility(false);
}

void ASeedResident::Initialise(ASeedWorldDirector* InDirector, int32 InSettlementIndex, int32 InResourceIndex, int32 InSeed, const FLinearColor& InCulture)
{
    Director = InDirector;
    SettlementIndex = InSettlementIndex;
    ResourceIndex = InResourceIndex;
    Seed = InSeed;
    Culture = InCulture;
    Pace = 165.f + float(Seed % 85);

    Torso->SetMaterial(0, ResidentMaterial(this, Culture));
    LeftArm->SetMaterial(0, ResidentMaterial(this, Culture * .76f));
    RightArm->SetMaterial(0, ResidentMaterial(this, Culture * .76f));
    LeftLeg->SetMaterial(0, ResidentMaterial(this, FLinearColor(.09f, .12f, .16f)));
    RightLeg->SetMaterial(0, ResidentMaterial(this, FLinearColor(.09f, .12f, .16f)));
    Head->SetMaterial(0, ResidentMaterial(this, FLinearColor(.72f + (Seed % 11) * .014f, .44f + (Seed % 7) * .018f, .28f + (Seed % 5) * .012f)));
    Parcel->SetMaterial(0, ResidentMaterial(this, FLinearColor(.86f, .54f, .19f)));

    SetActorLocation(Director->GetSettlementLocation(SettlementIndex) + FVector(0.f, 0.f, 16.f));
    ChooseNextTask();
}

void ASeedResident::ChooseNextTask()
{
    if (!Director)
    {
        return;
    }
    Target = bCarrying ? Director->GetSettlementLocation(SettlementIndex) : Director->GetResourceLocation(ResourceIndex);
    Target.Z = Director->GetGroundHeight(Target.X, Target.Y) + 8.f;
}

void ASeedResident::UpdatePose(float DeltaSeconds)
{
    GaitTime += DeltaSeconds * (bCarrying ? 5.5f : 7.5f);
    const float Swing = FMath::Sin(GaitTime) * 24.f;
    LeftArm->SetRelativeRotation(FRotator(Swing, 0.f, 0.f));
    RightArm->SetRelativeRotation(FRotator(-Swing, 0.f, 0.f));
    LeftLeg->SetRelativeRotation(FRotator(-Swing, 0.f, 0.f));
    RightLeg->SetRelativeRotation(FRotator(Swing, 0.f, 0.f));
}

void ASeedResident::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if (!Director)
    {
        return;
    }

    FVector Position = GetActorLocation();
    const FVector Delta = Target - Position;
    const float Distance = Delta.Size2D();
    if (Distance < 90.f)
    {
        if (bCarrying)
        {
            Director->ReceiveMaterial(SettlementIndex, Culture);
            bCarrying = false;
            Parcel->SetVisibility(false);
            ResourceIndex = (ResourceIndex + 1 + (Seed % 5)) % Director->GetResourceCount();
        }
        else
        {
            bCarrying = true;
            Parcel->SetVisibility(true);
        }
        ChooseNextTask();
        return;
    }

    const FVector Direction = FVector(Delta.X, Delta.Y, 0.f).GetSafeNormal();
    Position += Direction * Pace * DeltaSeconds;
    Position.Z = Director->GetGroundHeight(Position.X, Position.Y) + 8.f;
    SetActorLocation(Position);
    SetActorRotation(Direction.Rotation());
    UpdatePose(DeltaSeconds);
}
