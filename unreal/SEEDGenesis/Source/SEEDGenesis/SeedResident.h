#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "SeedResident.generated.h"

class ASeedWorldDirector;
class UStaticMeshComponent;
class USceneComponent;

/** A small autonomous resident assembled from engine geometry and animated by its current task. */
UCLASS()
class SEEDGENESIS_API ASeedResident : public AActor
{
    GENERATED_BODY()

public:
    ASeedResident();
    virtual void Tick(float DeltaSeconds) override;

    void Initialise(ASeedWorldDirector* InDirector, int32 InSettlementIndex, int32 InResourceIndex, int32 InSeed, const FLinearColor& InCulture);

private:
    void ChooseNextTask();
    void UpdatePose(float DeltaSeconds);

    UPROPERTY(VisibleAnywhere)
    TObjectPtr<USceneComponent> Root;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UStaticMeshComponent> Torso;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UStaticMeshComponent> Head;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UStaticMeshComponent> LeftArm;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UStaticMeshComponent> RightArm;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UStaticMeshComponent> LeftLeg;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UStaticMeshComponent> RightLeg;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UStaticMeshComponent> Parcel;

    UPROPERTY()
    TObjectPtr<ASeedWorldDirector> Director;

    int32 SettlementIndex = 0;
    int32 ResourceIndex = 0;
    int32 Seed = 0;
    float Pace = 210.f;
    float GaitTime = 0.f;
    bool bCarrying = false;
    FVector Target = FVector::ZeroVector;
    FLinearColor Culture = FLinearColor::White;
};
