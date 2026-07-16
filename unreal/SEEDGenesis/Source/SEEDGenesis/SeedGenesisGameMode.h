#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "SeedGenesisGameMode.generated.h"

class ASeedWorldDirector;

/** Creates a runnable world from simulation rules rather than a hand-authored level. */
UCLASS()
class SEEDGENESIS_API ASeedGenesisGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<ASeedWorldDirector> WorldDirector;
};
